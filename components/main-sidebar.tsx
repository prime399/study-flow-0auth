"use client"
import { api } from "@/convex/_generated/api"
import { useQuery } from "convex/react"
import {
  BookOpen,
  Bot,
  Calendar,
  LayoutDashboard,
  ListChecks,
  Trophy,
  Users,
  ChevronLeft,
  ChevronRight,
  Settings,
  Sparkles,
  BarChart3,
  LayoutGrid,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { CommandMenu } from "./command-menu"
import Logo from "./logo"
import { Button } from "./ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "./ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"
import { UserMenu } from "./user-menu"
import { TopsDisplay } from "./tops-display"
import { cn } from "@/lib/utils"

const menuItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Study",
    href: "/dashboard/study",
    icon: BookOpen,
  },
  {
    name: "Tasks",
    href: "/dashboard/todos",
    icon: ListChecks,
  },
  {
    name: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
    hasCalendarSubMenu: true,
    subItems: [
      {
        name: "Overview",
        href: "/dashboard/calendar/overview",
        icon: LayoutGrid,
      },
      {
        name: "Calendar View",
        href: "/dashboard/calendar",
        icon: Calendar,
      },
      {
        name: "Analytics",
        href: "/dashboard/calendar/analytics",
        icon: BarChart3,
      },
      {
        name: "AI Recommendations",
        href: "/dashboard/calendar/recommendations",
        icon: Sparkles,
      },
    ],
  },
  {
    name: "Groups",
    href: "/dashboard/groups",
    icon: Users,
    hasSubMenu: true,
  },
  {
    name: "Leaderboards",
    href: "/dashboard/leaderboards",
    icon: Trophy,
  },
  {
    name: "AI Helper",
    href: "/dashboard/ai-helper",
    icon: Bot,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

function NavGroupsSkeleton() {
  return (
    <SidebarMenu>
      {Array.from({ length: 3 }).map((_, index) => (
        <SidebarMenuItem key={index}>
          <SidebarMenuSkeleton />
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

export default function MainSidebar() {
  const viewer = useQuery(api.users.viewer)
  const groups = useQuery(api.groups.listMyGroups)
  const pathname = usePathname()
  const { state, toggleSidebar } = useSidebar()
  const [calendarOpen, setCalendarOpen] = useState(
    pathname.startsWith("/dashboard/calendar")
  )
  const [groupsOpen, setGroupsOpen] = useState(false)

  if (!viewer || !groups) {
    return (
      <Sidebar
        variant="inset"
        collapsible="icon"
        className="rounded-lg border bg-background"
      >
        <SidebarHeader className="w-full items-center bg-background">
          <div className="relative w-full">
            <Link href="/" className="flex items-center gap-2 pb-2">
              <Logo variant={state === "collapsed" ? "small" : "default"} />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="absolute -right-3 top-0 z-20 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent"
            >
              {state === "collapsed" ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronLeft className="h-3 w-3" />
              )}
            </Button>
          </div>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent className="bg-background p-2">
          <SidebarMenu>
            {menuItems.map((item) => {
              if (item.hasCalendarSubMenu && item.subItems) {
                return (
                  <Collapsible
                    key={item.name}
                    open={calendarOpen}
                    onOpenChange={setCalendarOpen}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.name}
                          className="gap-3"
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.name}</span>
                          <ChevronDown
                            className={cn(
                              "ml-auto h-4 w-4 transition-transform duration-200",
                              calendarOpen && "rotate-180"
                            )}
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.href}
                              >
                                <Link href={subItem.href}>
                                  <subItem.icon className="h-3 w-3 shrink-0" />
                                  <span>{subItem.name}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              }

              if (item.hasSubMenu) {
                return (
                  <Collapsible
                    key={item.name}
                    open={groupsOpen}
                    onOpenChange={setGroupsOpen}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <div className="relative flex items-center">
                        <SidebarMenuButton
                          asChild
                          tooltip={item.name}
                          className="flex-1 gap-3 pr-8"
                          isActive={pathname.startsWith("/dashboard/groups")}
                        >
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 h-6 w-6 p-0 hover:bg-sidebar-accent"
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform duration-200",
                                groupsOpen && "rotate-180"
                              )}
                            />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent>
                        <NavGroupsSkeleton />
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              }

              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.name}
                    className="gap-3"
                    isActive={pathname === item.href}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter className="bg-background">
          <SidebarMenuSkeleton />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    )
  }

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="rounded-lg border bg-background"
    >
      <SidebarHeader className="w-full items-center bg-background">
        <div className="relative w-full">
          <Link href="/" className="flex items-center gap-2 pb-2">
            <Logo variant={state === "collapsed" ? "small" : "default"} />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="absolute -right-3 top-0 z-20 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent"
          >
            {state === "collapsed" ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </div>
        {state === "expanded" && <CommandMenu />}
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent className="bg-background p-2">
        <SidebarMenu>
          {menuItems.map((item) => {
            if (item.hasCalendarSubMenu && item.subItems) {
              return (
                <Collapsible
                  key={item.name}
                  open={calendarOpen}
                  onOpenChange={setCalendarOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.name}
                        className="gap-3"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.name}</span>
                        <ChevronDown
                          className={cn(
                            "ml-auto h-4 w-4 transition-transform duration-200",
                            calendarOpen && "rotate-180"
                          )}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.subItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.href}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === subItem.href}
                            >
                              <Link href={subItem.href}>
                                <subItem.icon className="h-3 w-3 shrink-0" />
                                <span>{subItem.name}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )
            }

            if (item.hasSubMenu) {
              return (
                <Collapsible
                  key={item.name}
                  open={groupsOpen}
                  onOpenChange={setGroupsOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <div className="relative flex items-center">
                      <SidebarMenuButton
                        asChild
                        tooltip={item.name}
                        className="flex-1 gap-3 pr-8"
                        isActive={pathname.startsWith("/dashboard/groups")}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 h-6 w-6 p-0 hover:bg-sidebar-accent"
                        >
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform duration-200",
                              groupsOpen && "rotate-180"
                            )}
                          />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      {groups && (
                        <SidebarMenuSub>
                          {groups.length === 0 ? (
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === "/dashboard/groups"}
                              >
                                <Link href="/dashboard/groups?tab=discover">
                                  <span>Discover Groups</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ) : (
                            <>
                              {groups.map((group) => (
                                <SidebarMenuSubItem key={group._id}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={pathname === `/dashboard/groups/${group._id}`}
                                  >
                                    <Link href={`/dashboard/groups/${group._id}`}>
                                      <span>{group.name}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={pathname === "/dashboard/groups"}
                                >
                                  <Link href="/dashboard/groups?tab=discover">
                                    <span>Discover Groups</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            </>
                          )}
                        </SidebarMenuSub>
                      )}
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )
            }

            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.name}
                  className="gap-3"
                  isActive={pathname === item.href}
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="bg-background">
        {state === "expanded" && <TopsDisplay />}
        <UserMenu
          state={state}
          avatar={viewer?.image!}
          name={viewer?.name!}
          email={viewer?.email!}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
