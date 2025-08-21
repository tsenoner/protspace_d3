"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseSearchBarParams {
  onSearch: (query: string) => void;
  availableProteinIds?: readonly string[];
}

export function useSearchBar({
  onSearch,
  availableProteinIds = [],
}: UseSearchBarParams) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);

  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query === "") return [] as string[];
    return availableProteinIds
      .filter((id) => id.toLowerCase().includes(query))
      .slice(0, 10);
  }, [searchQuery, availableProteinIds]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSearch(searchQuery);
      setShowSuggestions(false);
    },
    [onSearch, searchQuery]
  );

  const handleSelectSuggestion = useCallback(
    (suggestion: string) => {
      setSearchQuery(suggestion);
      onSearch(suggestion);
      setShowSuggestions(false);
      if (inputRef.current) inputRef.current.focus();
    },
    [onSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (suggestions.length === 0 || !showSuggestions) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestion((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && activeSuggestion >= 0) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[activeSuggestion]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        setActiveSuggestion(-1);
      }
    },
    [activeSuggestion, handleSelectSuggestion, showSuggestions, suggestions]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return {
    // state
    searchQuery,
    showSuggestions,
    activeSuggestion,
    suggestions,
    // refs
    formRef,
    inputRef,
    // setters
    setSearchQuery,
    setShowSuggestions,
    setActiveSuggestion,
    // handlers
    handleSearch,
    handleSelectSuggestion,
    handleKeyDown,
  } as const;
}


