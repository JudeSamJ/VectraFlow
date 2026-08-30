import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { useAuthStore } from "../../stores/authStore";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { useUIStore } from "../../stores/uiStore";

export function TopNav() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const toggleMobileNav = useUIStore((s) => s.toggleMobileNav);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const logout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <header
      style={{
        height: "var(--topnav-height)",
        borderBottom: "1px solid var(--border-default)",
        display: "flex",
        alignItems: "center",
        justifyContent: isMobile ? "space-between" : "flex-end",
        padding: isMobile ? "0 12px" : "0 24px",
        gap: 8,
        background: "var(--bg-primary)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        flexShrink: 0,
      }}
    >
      {isMobile && (
        <Button variant="icon" onClick={toggleMobileNav} aria-label="Open menu">
          <Menu size={18} />
        </Button>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Button variant="icon">
          <Bell size={16} />
        </Button>
        <div ref={menuRef} style={{ position: "relative" }}>
          <div
            onClick={() => setOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                background:
                  "linear-gradient(135deg, var(--accent), var(--status-pending))",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {user?.full_name?.[0]?.toUpperCase() ?? "U"}
            </div>
            {!isMobile && (
              <span
                style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}
              >
                {user?.full_name ?? "User"}
              </span>
            )}
            <ChevronDown size={14} color="var(--text-muted)" />
          </div>

          {open && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                minWidth: 200,
                maxWidth: isMobile ? "calc(100vw - 24px)" : undefined,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-emphasis)",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                padding: 6,
                zIndex: 100,
              }}
            >
              <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-default)", marginBottom: 4 }}>
                <p style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{user?.full_name ?? "User"}</p>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{user?.email}</p>
              </div>
              <button
                onClick={logout}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  background: "none", border: "none", cursor: "pointer",
                  padding: "8px 10px", borderRadius: "var(--radius-sm)",
                  color: "var(--status-high)", fontSize: "var(--text-sm)", textAlign: "left",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,77,77,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
