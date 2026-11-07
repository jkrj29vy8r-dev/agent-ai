import { Badge } from "@/components/ui/badge"
import { CHANNELS, type Channel } from "@/lib/channels"
import { cn } from "@/lib/utils"

import { Plug } from "./plug"

type ChannelPlateProps = {
  channel: Channel
  connected?: boolean
  className?: string
}

/** Plăcuța unui canal: mufa în culoarea cablului + numele canalului + starea. */
export function ChannelPlate({ channel, connected = false, className }: ChannelPlateProps) {
  return (
    <Badge className={cn("h-8 gap-2 pr-3 pl-1.5", className)}>
      <Plug channel={channel} connected={connected} />
      <span>{CHANNELS[channel].label}</span>
      <span className="font-normal text-muted-foreground">
        {connected ? "conectat" : "neconectat"}
      </span>
    </Badge>
  )
}
