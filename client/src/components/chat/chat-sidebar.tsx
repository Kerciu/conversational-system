"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Plus,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Conversation, ConversationGroup } from "@/types/chat"
import { groupConversations, groupLabels } from "@/lib/chat-utils"
import { useAuth } from "@/contexts/auth-context"

interface ChatSidebarProps {
  conversations: Conversation[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onDeleteConversation: (id: string) => void
  onRenameConversation: (id: string, newTitle: string) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  isCollapsed,
  onToggleCollapse,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [userEmail, setUserEmail] = useState("user@example.com")
  const [userName, setUserName] = useState("User")
  const { logout } = useAuth()
  const router = useRouter()

  const userInitials = (userName && userName !== "User")
    ? userName.slice(0, 2).toUpperCase()
    : "?";
  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const groupedConversations = groupConversations(filteredConversations)

  const handleStartRename = (conv: Conversation) => {
    setEditingId(conv.id)
    setEditingTitle(conv.title)
  }

  const handleSaveRename = () => {
    if (editingId && editingTitle.trim()) {
      onRenameConversation(editingId, editingTitle.trim())
    }
    setEditingId(null)
    setEditingTitle("")
  }

  const handleLogout = () => {
    logout()
    router.push("/auth/login")
  }

  useEffect(() => {
    const fetchUserData = async () => {
      const API_BASE = 'http://localhost:8080/api/dashboard'
      try {
        const [emailRes, usernameRes] = await Promise.all([
          fetch(`${API_BASE}/get-email`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem("token")}`,
            }
          }),
          fetch(`${API_BASE}/get-username`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem("token")}`,
            }
          })
        ])

        if (emailRes.ok) {
          const email = await emailRes.text()
          setUserEmail(email)
        }
        if (usernameRes.ok) {
          const username = await usernameRes.text()
          setUserName(username)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    fetchUserData()
  }, [])

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <div className="flex h-full w-16 flex-col border-r border-border/50 bg-sidebar/80 backdrop-blur-md">
          {/* Decorative gradient line */}
          <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-primary/20 via-accent/10 to-transparent" />

          {/* Logo */}
          <div className="flex h-14 items-center justify-center border-b border-border/50">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleCollapse}
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground group"
                >
                  <div className="absolute -inset-1 rounded-xl bg-primary/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Sparkles className="h-5 w-5 relative" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </div>

          {/* New Chat */}
          <div className="p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onNewConversation}
                  size="icon"
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 glow-primary btn-glow border-0"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New conversation</TooltipContent>
            </Tooltip>
          </div>

          {/* Conversations */}
          <ScrollArea className="flex-1 px-2">
            <div className="space-y-1 py-2">
              {conversations.slice(0, 10).map((conv) => (
                <Tooltip key={conv.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onSelectConversation(conv.id)}
                      className={cn(
                        "flex h-10 w-full items-center justify-center rounded-lg transition-all duration-200",
                        activeConversationId === conv.id
                          ? "bg-secondary text-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                      )}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{conv.title}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </ScrollArea>

          {/* User */}
          <div className="border-t border-border/50 p-2">
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-10 w-full items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/20 text-xs text-primary">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">User menu</TooltipContent>
              </Tooltip>
              <DropdownMenuContent side="right" align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </TooltipProvider>
    )
  }

  return (
    <div className="relative flex h-full w-72 flex-col border-r border-border/50 bg-sidebar/80 backdrop-blur-md">
      {/* Decorative gradient line */}
      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-primary/20 via-accent/10 to-transparent" />

      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border/50 px-4">
        <div className="flex items-center gap-2 group">
          <div className="relative">
            <div className="absolute -inset-1 rounded-xl bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <span className="font-semibold tracking-tight">Decisio.ai</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* New Conversation Button */}
      <div className="p-3">
        <Button
          onClick={onNewConversation}
          className="w-full justify-start gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 glow-primary btn-glow border-0"
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary/50 border-border/50 focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 px-3">
        {(Object.keys(groupedConversations) as ConversationGroup[]).map((group) => {
          const convs = groupedConversations[group]
          if (convs.length === 0) return null

          return (
            <div key={group} className="mb-4">
              <h3 className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                {groupLabels[group]}
              </h3>
              <div className="space-y-1">
                {convs.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      "group relative flex items-center rounded-lg pr-1 transition-all duration-200",
                      activeConversationId === conv.id ? "bg-secondary shadow-sm" : "hover:bg-secondary/50",
                    )}
                  >
                    {activeConversationId === conv.id && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-gradient-to-b from-primary to-accent" />
                    )}

                    {editingId === conv.id ? (
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={handleSaveRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename()
                          if (e.key === "Escape") {
                            setEditingId(null)
                            setEditingTitle("")
                          }
                        }}
                        className="h-9 bg-background"
                        autoFocus
                      />
                    ) : (
                      <>
                        <button
                          onClick={() => onSelectConversation(conv.id)}
                          className="flex flex-1 items-center gap-2 overflow-hidden px-2 py-2 text-left"
                        >
                          <MessageSquare
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              activeConversationId === conv.id ? "text-primary" : "text-muted-foreground",
                            )}
                          />
                          <span className="truncate text-sm">{conv.title}</span>
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => handleStartRename(conv)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDeleteConversation(conv.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </ScrollArea>

      {/* User Profile */}
      <div className="border-t border-border/50 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-secondary/50 group">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/20 text-primary group-hover:from-primary/40 group-hover:to-accent/30 transition-colors">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{userName}</p>
                <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
