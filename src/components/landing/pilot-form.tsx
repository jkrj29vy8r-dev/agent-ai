"use client"

import { CircleCheck } from "lucide-react"
import Link from "next/link"
import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VERTICAL_OPTIONS } from "@/lib/verticals"

import { submitPilotRequest, type PilotState } from "./pilot-action"

function FieldError({ id, children }: { id: string; children?: string }) {
  if (!children) return null
  return (
    <p id={id} className="text-sm text-destructive">
      {children}
    </p>
  )
}

export function PilotForm() {
  const [state, action, pending] = useActionState<PilotState, FormData>(submitPilotRequest, {
    status: "idle",
  })
  const errors = state.fieldErrors ?? {}
  // Controlat: React golește formularul după trimitere, iar domeniul ales
  // trebuie să rămână dacă alt câmp are o eroare.
  const [vertical, setVertical] = useState("")

  if (state.status === "ok") {
    return (
      <div role="status" className="flex gap-4 rounded-panel border border-success/40 bg-background p-panel">
        <CircleCheck className="size-6 shrink-0 text-success" aria-hidden />
        <div>
          <p className="type-engraved text-xl">Am primit cererea.</p>
          <p className="mt-2">Te sunăm noi ca să stabilim împreună pornirea agentului.</p>
        </div>
      </div>
    )
  }

  return (
    <form action={action} noValidate className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="pilot-firma">Numele firmei</Label>
        <Input
          id="pilot-firma"
          name="businessName"
          autoComplete="organization"
          required
          defaultValue={state.values?.businessName}
          aria-invalid={Boolean(errors.businessName)}
          aria-describedby={errors.businessName ? "pilot-firma-eroare" : undefined}
        />
        <FieldError id="pilot-firma-eroare">{errors.businessName}</FieldError>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 sm:gap-5">
        <div className="grid content-start gap-2">
          <Label htmlFor="pilot-domeniu">Domeniul</Label>
          <Select name="vertical" required value={vertical} onValueChange={setVertical}>
            <SelectTrigger
              id="pilot-domeniu"
              className="w-full"
              aria-invalid={Boolean(errors.vertical)}
              aria-describedby={errors.vertical ? "pilot-domeniu-eroare" : undefined}
            >
              <SelectValue placeholder="Alege domeniul" />
            </SelectTrigger>
            <SelectContent>
              {VERTICAL_OPTIONS.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id="pilot-domeniu-eroare">{errors.vertical}</FieldError>
        </div>

        <div className="grid content-start gap-2">
          <Label htmlFor="pilot-telefon">Telefonul</Label>
          <Input
            id="pilot-telefon"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="0722 123 456"
            defaultValue={state.values?.phone}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "pilot-telefon-eroare" : undefined}
          />
          <FieldError id="pilot-telefon-eroare">{errors.phone}</FieldError>
        </div>
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Se trimite…" : "Trimite cererea"}
        </Button>
        <p className="max-w-measure text-sm text-muted-foreground">
          Folosim datele doar ca să te contactăm despre pilot. Detalii în{" "}
          <Link href="/legal/confidentialitate" className="text-primary underline underline-offset-4">
            politica de confidențialitate
          </Link>
          .
        </p>
      </div>
    </form>
  )
}
