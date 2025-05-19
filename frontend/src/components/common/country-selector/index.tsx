import React, { MutableRefObject, useEffect, useRef, useState } from "react";
import { SelectMenuOption, COUNTRIES } from "./countries";

export const CountrySelector = ({
    id,
    open,
    disabled = false,
    onToggle,
    onChange,
    selectedValue,
}: {
    id: string;
    open: boolean;
    disabled?: boolean;
    onToggle: () => void;
    onChange: (value: SelectMenuOption["code"]) => void;
    selectedValue: SelectMenuOption;
}) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mutableRef = ref as MutableRefObject<HTMLDivElement | null>;

        const handleClickOutside = (event: any) => {
            if (
                mutableRef.current &&
                !mutableRef.current.contains(event.target) &&
                open
            ) {
                onToggle();
                setQuery("");
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref]);

    const [query, setQuery] = useState("");

    return (
        <div ref={ref}>
            <div className="w-20">
                <button
                    type="button"
                    className={`${disabled ? "bg-neutral-100" : "bg-[#262626]"
                        } w-full rounded-xl px-2 md:py-3.5 py-3 text-white cursor-default focus:outline-none sm:text-sm`}
                    aria-haspopup="listbox"
                    aria-expanded="true"
                    aria-labelledby="listbox-label"
                    onClick={onToggle}
                    disabled={disabled}
                >
                    <span className="truncate flex items-center ">
                        <img
                            alt={`${selectedValue.value}`}
                            src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${selectedValue.value}.svg`}
                            className={"inline mr-1 h-4 rounded-sm"}
                        />
                        {selectedValue.code}
                    </span>
                </button>

                {open && <div className="absolute z-10 mt-4 lg:w-[455px] w-5/6 bg-[#262626] rounded-md text-base">
                    <div className="sticky top-0 z-10 bg-[#262626] rounded-md">
                        <div className="text-gray-900 bg-[#262626] cursor-default px-4 py-2 rounded-md">
                            <div className="relative">
                                <img
                                    alt="search icon"
                                    src="/assets/icon/search.svg"
                                    className="absolute inset-y-0 left-2 mt-2 flex items-center h-4"
                                />
                                <input
                                    type="search"
                                    name="search"
                                    className="rounded-lg focus:outline-none block w-full pl-8 pr-2.5 py-1 dark:bg-[#7676803D] dark:placeholder-gray-400 dark:text-white"
                                    placeholder="Search"
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div
                        className="max-h-64 px-4 py-4 scrollbar scrollbar-track-gray-100 scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-600 scrollbar-thumb-rounded scrollbar-thin overflow-y-scroll"
                    >
                        {COUNTRIES.filter((country) =>
                            country.title.toLowerCase().startsWith(query.toLowerCase())
                        ).length === 0 ? (
                            <li className="text-gray-900 cursor-default select-none relative py-2 pl-3 pr-9">
                                No countries found
                            </li>
                        ) : (
                            COUNTRIES.filter((country) =>
                                country.title.toLowerCase().startsWith(query.toLowerCase())
                            ).map((value, index) => (
                                <li
                                    key={`${id}-${index}`}
                                    className="text-white cursor-default select-none relative py-4 pl-3 pr-9 flex items-center transition border-b border-[#7676803D] mb-2"
                                    id="listbox-option-0"
                                    role="option"
                                    onClick={() => {
                                        onChange(value.code); 
                                        setQuery("");
                                        onToggle();
                                    }}
                                >
                                    <img
                                        alt={`${value.value}`}
                                        src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${value.value}.svg`}
                                        className="inline mr-2 h-4 rounded-sm"
                                    />
                                    <span className="font-normal truncate">
                                        {value.code}
                                    </span>
                                    <span className="font-normal truncate ml-4">
                                        {value.title}
                                    </span>

                                    {value.code === selectedValue.code ? (
                                        <span className="text-blue-600 absolute inset-y-0 right-0 flex items-center pr-8">
                                            <svg
                                                className="h-5 w-5"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </span>
                                    ) : null}
                                </li>
                            ))
                        )}
                    </div>
                </div>}

            </div>
        </div>
    );
};
