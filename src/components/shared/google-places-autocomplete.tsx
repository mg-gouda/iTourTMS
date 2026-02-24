"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

interface GooglePlacesAutocompleteProps {
  apiKey: string;
  value?: string;
  onSelect: (address: string, lat: number | null, lng: number | null) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

let scriptLoadPromise: Promise<void> | null = null;

function getGoogle(): any {
  return (window as any).google;
}

function loadGooglePlacesScript(apiKey: string): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const g = getGoogle();
    if (g?.maps?.places) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error("Failed to load Google Places script"));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export function GooglePlacesAutocomplete({
  apiKey,
  value,
  onSelect,
  onChange,
  placeholder = "Search for an address...",
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(value ?? "");

  // Sync external value
  useEffect(() => {
    setInputValue(value ?? "");
  }, [value]);

  useEffect(() => {
    loadGooglePlacesScript(apiKey)
      .then(() => setLoaded(true))
      .catch(() => {
        // Silently fail — user can still type manually
      });
  }, [apiKey]);

  const handlePlaceChanged = useCallback(() => {
    const autocomplete = autocompleteRef.current;
    if (!autocomplete) return;

    const place = autocomplete.getPlace();
    if (!place.geometry?.location) return;

    const address = place.formatted_address ?? place.name ?? "";
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    setInputValue(address);
    onSelect(address, lat, lng);
  }, [onSelect]);

  useEffect(() => {
    if (!loaded || !inputRef.current || autocompleteRef.current) return;

    const g = getGoogle();
    if (!g?.maps?.places) return;

    const autocomplete = new g.maps.places.Autocomplete(inputRef.current, {
      types: ["establishment", "geocode"],
      fields: ["formatted_address", "name", "geometry.location"],
    });

    autocomplete.addListener("place_changed", handlePlaceChanged);
    autocompleteRef.current = autocomplete;

    return () => {
      g.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [loaded, handlePlaceChanged]);

  return (
    <Input
      ref={inputRef}
      value={inputValue}
      onChange={(e) => {
        setInputValue(e.target.value);
        onChange?.(e.target.value);
      }}
      placeholder={placeholder}
    />
  );
}
