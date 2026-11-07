"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { signIn, type SignInState } from "./actions"

export function SignInForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {})
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.email} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Parola</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Se verifică…" : "Intră în cont"}
      </Button>
    </form>
  )
}
