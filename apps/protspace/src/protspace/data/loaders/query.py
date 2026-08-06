"""UniProt query → FASTA downloader.

Extracted from UniProtQueryProcessor._search_and_download_fasta
and _extract_identifiers_from_fasta*.
"""

import gzip
import logging
import tempfile
from pathlib import Path

import requests
from tqdm import tqdm

logger = logging.getLogger(__name__)


def query_uniprot(
    query: str,
    *,
    save_to: Path | None = None,
) -> tuple[list[str], Path]:
    """Search UniProt and download FASTA.

    Args:
        query: UniProt search query string.
        save_to: If provided, save extracted FASTA here. Otherwise uses a temp file.

    Returns:
        Tuple of (identifiers, fasta_path).
    """
    logger.info(f"Searching UniProt for query: '{query}'")

    base_url = "https://rest.uniprot.org/uniprotkb/stream"
    params = {"compressed": "true", "format": "fasta", "query": query}
    temp_gz_file: Path | None = None
    staged_path: Path | None = None
    extracted_path: Path | None = None
    completed = False

    try:
        response = requests.get(base_url, params=params, stream=True)
        response.raise_for_status()

        # Download to temporary compressed file
        total_size = int(response.headers.get("content-length", 0))
        with tempfile.NamedTemporaryFile(
            mode="wb", suffix=".fasta.gz", delete=False
        ) as temp_file:
            temp_gz_file = Path(temp_file.name)
            with tqdm(
                total=total_size,
                unit="B",
                unit_scale=True,
                desc="Downloading FASTA",
            ) as pbar:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        temp_file.write(chunk)
                        pbar.update(len(chunk))

        # Extract identifiers from compressed FASTA
        identifiers = _extract_identifiers_gz(temp_gz_file)

        # Extract FASTA to final location
        if save_to is not None:
            save_to = Path(save_to)
            save_to.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(
                mode="w",
                prefix=f".{save_to.name}.",
                suffix=".tmp",
                dir=save_to.parent,
                delete=False,
            ) as staged_file:
                staged_path = Path(staged_file.name)
            extracted_path = staged_path
        else:
            extracted_path = temp_gz_file.with_suffix("")

        with gzip.open(temp_gz_file, "rt") as gz_file:
            content = gz_file.read()
            with open(extracted_path, "w") as out:
                out.write(content)

        extracted_identifiers = extract_identifiers_from_fasta(extracted_path)
        if extracted_identifiers != identifiers:
            raise ValueError("Extracted FASTA identifiers do not match the download")

        if save_to is not None:
            staged_path.replace(save_to)
            staged_path = None
            extracted_path = save_to

        completed = True
        logger.info(f"Downloaded and extracted {len(identifiers)} sequences")

        return identifiers, extracted_path

    except requests.RequestException as e:
        logger.error(f"Error downloading FASTA: {e}")
        raise
    except Exception as e:
        logger.error(f"Error processing FASTA: {e}")
        raise
    finally:
        if temp_gz_file is not None:
            temp_gz_file.unlink(missing_ok=True)
        if staged_path is not None:
            staged_path.unlink(missing_ok=True)
        if not completed and save_to is None and extracted_path is not None:
            extracted_path.unlink(missing_ok=True)


def extract_identifiers_from_fasta(fasta_path: Path) -> list[str]:
    """Extract protein identifiers from an uncompressed FASTA file."""
    from protspace.data.loaders.h5 import parse_identifier

    identifiers = []
    with open(fasta_path) as f:
        for line in f:
            if line.startswith(">"):
                raw = line[1:].strip().split()[0]
                identifiers.append(parse_identifier(raw))
    return identifiers


def _extract_identifiers_gz(fasta_gz_path: Path) -> list[str]:
    """Extract protein identifiers from a gzipped FASTA file."""
    from protspace.data.loaders.h5 import parse_identifier

    identifiers = []
    with gzip.open(fasta_gz_path, "rt") as f:
        for line in f:
            if line.startswith(">"):
                raw = line[1:].strip().split()[0]
                identifiers.append(parse_identifier(raw))
    return identifiers
