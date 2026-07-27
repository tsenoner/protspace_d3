"""Warn when a pLM checkpoint's HuggingFace licence stops matching our docs.

Model weights are not Python dependencies, so no dependency bot, SBOM or SCA tool
can see them. ESM-C was relicensed from non-commercial to MIT on 2026-05-27 and
our docs still said non-commercial two months later; nothing could have caught
that except asking the Hub.

Run offline-safe: a network failure is reported, not fatal.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

# checkpoint -> licence we currently document (apps/protspace/CLAUDE.md, docs/cli.md)
EXPECTED: dict[str, str] = {
    # ProtT5 declares no licence on its model card. Our docs say MIT on the strength
    # of the paper/repo rather than Hub metadata, so "" means "expect none declared" --
    # if one ever appears, this flags it so the claim can be checked against it.
    "Rostlab/prot_t5_xl_uniref50": "",
    "Rostlab/ProstT5": "mit",
    "facebook/esm2_t6_8M_UR50D": "mit",
    "facebook/esm2_t12_35M_UR50D": "mit",
    "facebook/esm2_t30_150M_UR50D": "mit",
    "facebook/esm2_t33_650M_UR50D": "mit",
    "facebook/esm2_t36_3B_UR50D": "mit",
    "ElnaggarLab/ankh-base": "cc-by-nc-sa-4.0",
    "ElnaggarLab/ankh-large": "cc-by-nc-sa-4.0",
    "ElnaggarLab/ankh3-large": "cc-by-nc-sa-4.0",
    "Synthyra/ESMplusplus_small": "mit",
    "Synthyra/ESMplusplus_large": "mit",
}

API = "https://huggingface.co/api/models/"


def fetch_licence(model: str) -> str | None:
    try:
        with urllib.request.urlopen(API + model, timeout=20) as resp:
            data = json.load(resp)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        print(f"  ?  {model}: could not query the Hub ({exc})")
        return None
    card = data.get("cardData") or {}
    lic = card.get("license") or card.get("license_name")
    if isinstance(lic, list):
        lic = lic[0] if lic else None
    # "" distinguishes "the Hub declares no licence" from None ("could not ask").
    return str(lic).lower() if lic else ""


def main() -> int:
    drifted: list[str] = []
    unknown = 0
    for model, expected in EXPECTED.items():
        actual = fetch_licence(model)
        if actual is None:
            unknown += 1
            continue
        if actual != expected:
            hub = actual or "none declared"
            want = expected or "none declared"
            drifted.append(f"  !  {model}: docs say {want}, Hub says {hub}")
        else:
            print(f"  ok {model}: {actual or 'no licence declared upstream'}")

    if drifted:
        print("\nLicence drift detected:")
        print("\n".join(drifted))
        print(
            "\nUpdate apps/protspace/CLAUDE.md, apps/protspace/docs/cli.md, the CLI help in\n"
            "cli/embed.py and cli/prepare.py, and the embedder hint in the Preparation notebook."
        )
        return 1

    if unknown:
        print(f"\n{unknown} model(s) could not be checked; treating as inconclusive, not failing.")
    print("\nAll checkable model licences match the documentation.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
