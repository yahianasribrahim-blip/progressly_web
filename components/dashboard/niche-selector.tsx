"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const NICHES = [
    { value: "hijab", label: "Hijab Tutorials", emoji: "🧕" },
    { value: "deen", label: "Deen Information", emoji: "🕌" },
    { value: "cultural", label: "Cultural", emoji: "🌙" },
    { value: "food", label: "Food & Cooking", emoji: "🍳" },
    { value: "gym", label: "Gym & Fitness", emoji: "💪" },
    { value: "pets", label: "Pets & Animals", emoji: "🐱" },
    { value: "storytelling", label: "Storytelling", emoji: "📖" },
];

interface NicheSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

export function NicheSelector({ value, onChange }: NicheSelectorProps) {
    return (
        <div className="space-y-2">
            <Label className="text-base font-medium">Select Your Niche</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Choose your content niche..." />
                </SelectTrigger>
                <SelectContent>
                    {NICHES.map((niche) => (
                        <SelectItem
                            key={niche.value}
                            value={niche.value}
                            className="py-3"
                        >
                            <span className="flex items-center gap-3">
                                <span className="text-lg">{niche.emoji}</span>
                                <span>{niche.label}</span>
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
