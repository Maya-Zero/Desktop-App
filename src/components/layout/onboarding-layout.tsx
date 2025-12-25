import { ReactNode } from "react";

export function OnboardingLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-md space-y-8">
                {children}
            </div>
        </div>
    );
}
