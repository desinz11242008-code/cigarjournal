import { MessageSquare, ScrollText, Settings2, Users } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const tabs = [
  { to: "/journal", label: "Journal", icon: ScrollText },
  { to: "/social", label: "Social", icon: Users },
  { to: "/forum", label: "Forum", icon: MessageSquare },
  { to: "/settings", label: "Settings", icon: Settings2 },
] as const;

const TabBar = () => {
  const location = useLocation();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {tabs.map((tab) => {
          const active = location.pathname.startsWith(tab.to);
          const Icon = tab.icon;

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5 transition-colors"
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.3 : 1.8}
                className={`transition-all duration-200 ${
                  active ? "text-accent" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10.5px] font-medium transition-colors duration-200 ${
                  active ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default TabBar;
