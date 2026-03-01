import { LayoutDashboard, Users, Settings, LogOut, CalendarDays, Sun, Moon } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <Sidebar collapsible="icon">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
          <span className="text-sm font-bold text-sidebar-primary-foreground">👁</span>
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-sidebar-accent-foreground">
            OptiCare Clinic
          </span>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Log Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
