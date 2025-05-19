export interface SelectMenuOption {
    value: string;
    title: string;
    code: string;
}

export const COUNTRIES: SelectMenuOption[] = [
    { value: "IN", title: "India", code: "+91" },
    { value: "US", title: "United States", code: "+1" }
];
