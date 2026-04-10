"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  UserCog,
  ClipboardList,
  AlertCircle,
  Plus,
  X,
  Check,
  Clock
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ModeratorPanelProps {
  groupId: Id<"groups">
  isAdmin: boolean
}

export function ModeratorPanel({ groupId, isAdmin }: ModeratorPanelProps) {
  const moderators = useQuery(api.moderators.getModerators, { groupId })
  const members = useQuery(api.groups.getMembers, { groupId })
  const auditLogs = useQuery(api.moderators.getModeratorLogs, { groupId, limit: 50 })
  const assignModerator = useMutation(api.moderators.assignModerator)
  const removeModerator = useMutation(api.moderators.removeModerator)

  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)

  const nonModeratorMembers = members?.filter(
    (m) => m.role !== "moderator" && m.role !== "admin"
  ) || []

  const handleAssignModerator = async (userId: Id<"users">) => {
    setIsAssigning(true)
    try {
      // Default moderator permissions
      const permissions = [
        "group:message:pin",
        "group:message:delete",
        "group:message:edit",
        "group:thread:lock",
        "group:audit:view",
      ]

      await assignModerator({
        groupId,
        targetUserId: userId,
        auth0Permissions: permissions,
      })

      // Sync with Auth0 (optional, if Auth0 is configured)
      try {
        await fetch("/api/moderators/sync-auth0", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId,
            targetUserId: userId,
            auth0Permissions: permissions,
          }),
        })
      } catch (error) {
        console.warn("Auth0 sync failed (optional):", error)
      }

      toast.success("Moderator assigned successfully!")
      setShowAssignDialog(false)
      setSelectedMember(null)
    } catch (error) {
      console.error("Error assigning moderator:", error)
      toast.error(error instanceof Error ? error.message : "Failed to assign moderator")
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRemoveModerator = async (userId: Id<"users">, userName: string) => {
    if (!confirm(`Remove moderator ${userName}? They will become a regular member.`)) {
      return
    }

    try {
      await removeModerator({
        groupId,
        targetUserId: userId,
        reason: "Removed by admin",
      })

      toast.success("Moderator removed successfully!")
    } catch (error) {
      console.error("Error removing moderator:", error)
      toast.error(error instanceof Error ? error.message : "Failed to remove moderator")
    }
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-muted-foreground" />
            Access Denied
          </CardTitle>
          <CardDescription>
            Only group admins can manage moderators
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="moderators" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="moderators" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Moderators ({moderators?.length || 0})
        </TabsTrigger>
        <TabsTrigger value="audit" className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Audit Log
        </TabsTrigger>
      </TabsList>

      <TabsContent value="moderators" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Moderator Management
                </CardTitle>
                <CardDescription>
                  Assign moderators to help manage discussions
                </CardDescription>
              </div>
              <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Assign Moderator
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Assign Moderator Role</DialogTitle>
                    <DialogDescription>
                      Select a member to promote to moderator. They will be able to pin, edit, and delete messages.
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2">
                      {nonModeratorMembers.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-8">
                          No members available to assign as moderators
                        </p>
                      ) : (
                        nonModeratorMembers.map((member) => (
                          <div
                            key={member._id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={member.user?.image} />
                                <AvatarFallback>
                                  {member.user?.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">
                                  {member.user?.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Member since{" "}
                                  {formatDistanceToNow(member.joinedAt, {
                                    addSuffix: true,
                                  })}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAssignModerator(member.user!._id)}
                              disabled={isAssigning}
                            >
                              <Check className="mr-2 h-3 w-3" />
                              Assign
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!moderators || moderators.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <UserCog className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No Moderators Assigned</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Assign moderators to help manage discussions, pin important threads, and maintain quality.
                  </p>
                </div>
              ) : (
                moderators.map((mod) => (
                  <div
                    key={mod._id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={mod.userImage} />
                        <AvatarFallback className="bg-primary/10">
                          <Shield className="h-5 w-5 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{mod.userName}</p>
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="mr-1 h-3 w-3" />
                            Moderator
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {mod.auth0Permissions?.slice(0, 3).map((perm) => (
                            <Badge
                              key={perm}
                              variant="outline"
                              className="text-[10px] px-1 h-5"
                            >
                              {perm.split(":").pop()}
                            </Badge>
                          ))}
                          {mod.auth0Permissions && mod.auth0Permissions.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1 h-5">
                              +{mod.auth0Permissions.length - 3} more
                            </Badge>
                          )}
                        </div>
                        {mod.lastAuth0Sync && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <Clock className="inline h-3 w-3 mr-1" />
                            Synced {formatDistanceToNow(mod.lastAuth0Sync, { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveModerator(mod.userId, mod.userName)}
                    >
                      <X className="mr-2 h-3 w-3" />
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Permissions Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Moderator Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Pin Messages</p>
                  <p className="text-xs text-muted-foreground">Highlight important discussions</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Delete Messages</p>
                  <p className="text-xs text-muted-foreground">Remove inappropriate content</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Edit Messages</p>
                  <p className="text-xs text-muted-foreground">Fix errors or clarify content</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Lock Threads</p>
                  <p className="text-xs text-muted-foreground">Prevent new replies</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="audit" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Moderator Actions Audit Log
            </CardTitle>
            <CardDescription>
              Track all moderator actions for compliance and transparency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {!auditLogs || auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">No moderator actions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div
                      key={log._id}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={log.moderatorImage} />
                        <AvatarFallback className="text-xs">
                          {log.moderatorName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {log.moderatorName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {log.action.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(log.createdAt, { addSuffix: true })}
                          </span>
                        </div>
                        {log.reason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Reason: {log.reason}
                          </p>
                        )}
                        {log.auth0Permissions && log.auth0Permissions.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            <Badge variant="secondary" className="text-[10px] px-1 h-4">
                              Auth0 RBAC
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
