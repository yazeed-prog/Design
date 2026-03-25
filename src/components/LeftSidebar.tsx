import { useState, useRef, useEffect } from 'react';
import {
  Search,
  Compass,
  ChartLine,
  Trophy,
  Plus,
  User,
  ChevronsUpDown,
  ChevronRight,
  Info,
  Shield,
  Settings,
  UserPlus,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';

// Icon component
function Icon() {
  return (
    <svg
      width="20"
      height="17"
      viewBox="0 0 20 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <path
        d="M5.73691 5.13466C4.6865 3.62695 5.09741 1.58027 6.65472 0.563305C8.21203 -0.453672 10.326 -0.0558332 11.3764 1.45189L18.471 11.635C19.5213 13.1427 19.1106 15.1894 17.5531 16.2063C15.9958 17.2234 13.8819 16.8256 12.8314 15.3178L9.75559 10.9029C9.36019 10.4205 8.55527 10.4956 8.07197 10.9635C7.67118 11.3514 7.53998 12.3441 7.42637 13.2037C7.4097 13.3297 7.39342 13.4528 7.37672 13.5708C7.31508 14.1333 7.11443 14.6898 6.76496 15.1916C5.62292 16.8307 3.32398 17.2629 1.63083 16.1572C-0.0622928 15.0516 -0.509646 12.826 0.632386 11.1867C1.22468 10.3366 2.12816 9.81111 3.0969 9.65646L3.09554 9.65511C5.8946 9.26208 6.41356 6.20373 5.9013 5.37061L5.73691 5.13466Z"
        fill="#8B5CF6"
      />
    </svg>
  );
}

const projects = [
  { id: 'project-1', name: 'Platform Team', letter: 'P', color: '#3B82F6', icon: false },
  { id: 'project-2', name: 'Marketing Automation', letter: 'M', color: '#EF4444', icon: false },
  { id: 'project-3', name: 'Sales Pipeline', letter: 'S', color: '#10B981', icon: false },
  { id: 'project-4', name: 'Customer Success', letter: 'C', color: '#F59E0B', icon: false },
  { id: 'project-5', name: 'Product Development', letter: 'P', color: '#8B5CF6', icon: false },
  { id: 'project-6', name: 'HR Operations', letter: 'H', color: '#EC4899', icon: false },
  { id: 'project-7', name: 'Finance', letter: 'F', color: '#14B8A6', icon: false },
  { id: 'project-8', name: 'IT Support', letter: 'I', color: '#F97316', icon: false },
  { id: 'personal', name: 'Personal', icon: true },
];

const avatarImage = 'https://images.unsplash.com/photo-1615843423179-bea071facf96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBhdmF0YXIlMjBoZWFkc2hvdHxlbnwxfHx8fDE3NzE0NjEyMjN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral';

import { useSidebar } from './ui/sidebar';

export function LeftSidebar() {
  const { setOpen } = useSidebar();
  const [activeItem, setActiveItem] = useState('explore');
  const [commandOpen, setCommandOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle scroll to show/hide fade indicators
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setShowTopFade(scrollTop > 0);
      setShowBottomFade(scrollTop + clientHeight < scrollHeight - 1);
    }
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      handleScroll();
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Handle Cmd+K to toggle command dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => {
          const newState = !prev;
          if (newState) {
            setOpen(false);
          }
          return newState;
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setOpen]);

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={() => {
        if (!commandOpen) setOpen(true);
      }}
      onMouseLeave={() => setOpen(false)}
      overlay={true}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="#">
                <div className="size-5 shrink-0 text-sidebar-foreground">
                  <Icon />
                </div>
                <span className="font-semibold text-foreground whitespace-nowrap">
                  Activepieces's Platform
                </span>
                <ChevronsUpDown className="ml-auto h-3.5 w-3.5 group-data-[collapsible=icon]:hidden text-sidebar-foreground" />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="flex flex-col h-full gap-0.5">
        <SidebarGroup className="shrink-0 sticky top-0 z-20 bg-sidebar py-0">
          <SidebarGroupContent className="py-0">
            <SidebarMenu className="pb-1 gap-[2px]">
              <SidebarMenuItem className="mb-1">
                <SidebarMenuButton asChild>
                  <button
                    onClick={() => {
                      setCommandOpen(true);
                      setOpen(false);
                    }}
                    className="bg-background border border-border hover:bg-accent transition-colors group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-transparent"
                  >
                    <Search className="text-sidebar-foreground" />
                    <span className="text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis font-normal">
                      Search...
                    </span>
                    <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 group-data-[collapsible=icon]:opacity-0">
                      <span className="text-xs">⌘</span>K
                    </kbd>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeItem === "explore"}
                  asChild
                >
                  <a
                    href="#"
                    onClick={() => setActiveItem("explore")}
                  >
                    <Compass className="text-sidebar-foreground" />
                    <span
                      className={`font-normal ${activeItem === "explore" ? "text-foreground font-semibold" : "text-sidebar-foreground"}`}
                    >
                      Explore
                    </span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeItem === "impact"}
                  asChild
                >
                  <a
                    href="#"
                    onClick={() => setActiveItem("impact")}
                    className="data-[active=true]:bg-sidebar-accent hover:bg-sidebar-accent"
                  >
                    <ChartLine className="text-sidebar-foreground" />
                    <span
                      className={`${activeItem === "impact" ? "font-semibold text-foreground" : "font-normal text-sidebar-foreground"}`}
                    >
                      Impact
                    </span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeItem === "leaderboard"}
                  asChild
                >
                  <a
                    href="#"
                    onClick={() =>
                      setActiveItem("leaderboard")
                    }
                  >
                    <Trophy className="text-sidebar-foreground" />
                    <span
                      className={`font-normal ${activeItem === "leaderboard" ? "text-foreground font-semibold" : "text-sidebar-foreground"}`}
                    >
                      Leaderboard
                    </span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="sticky top-0 bg-sidebar z-10 pl-4 pr-2 pt-0.5 pb-0.5 flex items-center justify-between h-auto group-data-[collapsible=icon]:hidden">
          <span className="text-[12px] font-normal text-muted-foreground">
            Projects
          </span>
          <button className="h-6 w-6 flex items-center justify-center rounded hover:bg-sidebar-accent transition-colors">
            <Plus
              className="h-3.5 w-3.5 text-sidebar-foreground"
              strokeWidth={2.5}
            />
          </button>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {showTopFade && (
            <div className="sticky top-0 left-0 right-0 h-[1px] bg-border pointer-events-none transition-opacity duration-300 z-30" />
          )}

          <SidebarGroup
            ref={scrollRef}
            className="h-full overflow-y-auto custom-scrollbar relative transition-all duration-300 py-0 pr-[2px]"
          >
            <SidebarGroupContent className="space-y-0.5 py-0">
              <SidebarMenu className="pb-2 gap-[2px]">
                {projects.map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      isActive={activeItem === project.id}
                      asChild
                    >
                      <a
                        href="#"
                        onClick={() =>
                          setActiveItem(project.id)
                        }
                      >
                        {project.icon ? (
                          <User className="size-4 shrink-0 text-sidebar-foreground" />
                        ) : (
                          <div
                            className="size-4 shrink-0 rounded-[4px] bg-[#3B82F6] flex items-center justify-center text-white text-xs font-semibold"
                            style={{ backgroundColor: project.color }}
                          >
                            {project.letter}
                          </div>
                        )}
                        <span
                          className={`${activeItem === project.id ? "font-semibold text-foreground" : "font-normal text-sidebar-foreground"}`}
                        >
                          {project.name}
                        </span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {showBottomFade && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-sidebar to-transparent pointer-events-none transition-opacity duration-300 z-20" />
          )}
        </div>
      </SidebarContent>

      <div className="px-2 pt-0 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:!hidden group-data-[collapsible=icon]:transition-none">
        <div className="rounded-lg border border-border bg-card p-3 space-y-2 group-data-[collapsible=icon]:p-2 overflow-hidden">
          <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center min-w-0">
            <div className="flex items-center gap-2 whitespace-nowrap opacity-100 group-data-[collapsible=icon]:opacity-0 transition-opacity duration-300 group-data-[state=expanded]:delay-[2000ms] min-w-0 overflow-hidden">
              <div className="w-1 h-1 rounded-full bg-sidebar-foreground shrink-0"></div>
              <span className="text-xs font-semibold text-sidebar-foreground shrink-0">
                Runs:
              </span>
            </div>
            <span className="text-xs font-normal text-sidebar-foreground whitespace-nowrap opacity-100 group-data-[collapsible=icon]:opacity-0 transition-opacity duration-300 group-data-[state=expanded]:delay-[2000ms] shrink-0">
              ∞ Unlimited
            </span>
          </div>
          <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center min-w-0">
            <div className="flex items-center gap-2 whitespace-nowrap opacity-100 group-data-[collapsible=icon]:opacity-0 transition-opacity duration-300 group-data-[state=expanded]:delay-[2000ms] min-w-0 overflow-hidden">
              <div className="w-1 h-1 rounded-full bg-sidebar-foreground shrink-0"></div>
              <span className="text-xs font-semibold text-sidebar-foreground shrink-0">
                AI Credits:
              </span>
              <Info className="h-3 w-3 text-sidebar-foreground cursor-pointer hover:opacity-70 transition-opacity shrink-0" />
            </div>
            <span className="text-xs font-normal text-sidebar-foreground whitespace-nowrap opacity-100 group-data-[collapsible=icon]:opacity-0 transition-opacity duration-300 group-data-[state=expanded]:delay-[2000ms] shrink-0">
              116,765 remaining
            </span>
          </div>
          <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center min-w-0">
            <div className="flex items-center gap-2 whitespace-nowrap opacity-100 group-data-[collapsible=icon]:opacity-0 transition-opacity duration-300 group-data-[state=expanded]:delay-[2000ms] min-w-0 overflow-hidden">
              <div className="w-1 h-1 rounded-full bg-sidebar-foreground shrink-0"></div>
              <span className="text-xs font-semibold text-sidebar-foreground shrink-0">
                Active Flows:
              </span>
            </div>
            <span className="text-xs font-normal text-sidebar-foreground whitespace-nowrap opacity-100 group-data-[collapsible=icon]:opacity-0 transition-opacity duration-300 group-data-[state=expanded]:delay-[2000ms] shrink-0">
              74 / Unlimited
            </span>
          </div>
          <button className="w-full flex items-center justify-start gap-1 pt-3 whitespace-nowrap opacity-100 group-data-[collapsible=icon]:opacity-0 transition-opacity duration-300 group-data-[state=expanded]:delay-[2000ms] hover:opacity-70 min-w-0 overflow-hidden">
            <span className="text-xs font-normal text-sidebar-foreground shrink-0">
              Manage Plan
            </span>
            <ChevronRight className="h-3 w-3 text-sidebar-foreground shrink-0" />
          </button>
        </div>
      </div>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-2 rounded-md p-[8px] text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground outline-none ring-sidebar-ring transition-colors focus-visible:ring-2">
                  <ImageWithFallback
                    src={avatarImage}
                    alt="User Avatar"
                    className="size-5 min-w-5 min-h-5 shrink-0 rounded-full"
                  />
                  <span className="group-data-[collapsible=icon]:hidden font-normal text-sidebar-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                    Yazeed Kamal
                  </span>
                  <ChevronsUpDown className="ml-auto h-3.5 w-3.5 group-data-[collapsible=icon]:hidden text-sidebar-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-[240px]">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-3">
                    <ImageWithFallback
                      src={avatarImage}
                      alt="User Avatar"
                      className="size-8 shrink-0 rounded-full"
                    />
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Yazeed Kamal</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        yazeed@activepieces.com
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Platform Admin</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <UserPlus className="mr-2 h-4 w-4" />
                  <span>Invite User</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Help & Feedback</span>
                  <ChevronRight className="ml-auto h-4 w-4" />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              <Search className="mr-2 h-4 w-4" />
              <span>Search Flows</span>
            </CommandItem>
            <CommandItem>
              <Plus className="mr-2 h-4 w-4" />
              <span>Create New Flow</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </Sidebar>
  );
}