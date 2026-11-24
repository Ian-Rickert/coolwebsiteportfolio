import { CloudShader } from "@/components/ui/cloud-shader"
import { FloatingButtons } from "@/floating-buttons"

const websites = [
  {
    label: "Garden Volunteer Scheduling App",
    href: "https://garden-app-f7dcc.web.app/",
  },
  {
    label: "Community Guitar App",
    href: "https://guitarnet.org/",
  },
  {
    label: "My First Website (just messing around)",
    href: "https://theianianbobian.web.app/",
  },
  {
    label: "My Bouncing DVD Logo Website Spinoff",
    href: "https://bouncingian.web.app/",
  },
  {
    label: "Website with all of the Songs I Can Play on Guitar",
    href: "https://ianrguitar.web.app/",
  },
  {
    label: "Hackathon Project I Co-Created",
    href: "https://duality-ef3d6.web.app/",
  },
  {
    label: "Press Conference Simulator",
    href: "https://nextquestion.online/",
  },
  {
    label: "Other Projects and Links",
    href: "https://linktr.ee/ianrickert",
  },
] as const

export default function App() {
  return (
    <>
      <CloudShader className="fixed inset-0 z-0 h-svh min-h-0 w-full" />
      <FloatingButtons websites={websites} />
      <img
        src="/ir-productions-logo.png"
        alt="IR Productions"
        draggable={false}
        className="pointer-events-none fixed bottom-3.5 left-3.5 z-20 w-[104px]"
      />
      <img
        src="/ian-portrait.png"
        alt="Ian Rickert"
        draggable={false}
        className="pointer-events-none fixed right-3.5 bottom-3.5 z-20 h-[148px] w-auto"
      />
    </>
  )
}
