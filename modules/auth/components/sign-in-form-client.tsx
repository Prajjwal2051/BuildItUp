"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Chrome, Github } from "lucide-react"
import { signIn } from "next-auth/react"

const SignInFormClient = () => {
    // Uses the auth client helper so OAuth starts without relying on server actions.
    const handleGoogleSignIn = async () => {
        await signIn("google", { callbackUrl: "/" })
    }

    const handleGithubSignIn = async () => {
        await signIn("github", { callbackUrl: "/" })
    }

    return (
        <Card className="w-full max-w-md mx-auto border-neutral-800 bg-transparent shadow-none">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center text-white">
                    Sign In
                </CardTitle>
                <CardDescription className="text-center text-neutral-400">
                    Choose your preferred sign-in method
                </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4">
                <Button
                    type="button"
                    onClick={handleGoogleSignIn}
                    variant={"outline"}
                    className="w-full bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800"
                >
                    <Chrome className="mr-2 h-4 w-4" />
                    <span>Sign in with Google</span>
                </Button>
                <Button
                    type="button"
                    onClick={handleGithubSignIn}
                    variant={"outline"}
                    className="w-full bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800"
                >
                    <Github className="mr-2 h-4 w-4" />
                    <span>Sign in with GitHub</span>
                </Button>
            </CardContent>

            <CardFooter className="rounded-corners border-t-neutral-800 bg-neutral-950/80 text-center text-sm text-neutral-500">
                <p className="text-sm text-cente ">
                    By signing in, you agree to our{" "}
                    <a href="#" className="underline hover:text-neutral-300">
                        Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="underline hover:text-neutral-300">
                        Privacy Policy
                    </a>
                    .
                </p>
            </CardFooter>
        </Card>
    );
};

export default SignInFormClient


