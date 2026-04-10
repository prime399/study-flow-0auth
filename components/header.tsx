import Link from "next/link"
import Logo from "./logo"
import { SidebarTrigger } from "./ui/sidebar"
import GoToActionButton from "./go-to-action-button"

type HeaderProps = {
  showSidebarTrigger?: boolean
}

export default function Header({ showSidebarTrigger = false }: HeaderProps) {
  return (
    <header className="flex w-full flex-row items-center justify-between bg-background px-4 py-2 md:hidden">
      <div className="flex flex-row items-center gap-2">
        {showSidebarTrigger ? (
          <SidebarTrigger />
        ) : (
          <Link href="/">
            <Logo />
          </Link>
        )}
      </div>
      {!showSidebarTrigger && <GoToActionButton />}
    </header>
  )
}
