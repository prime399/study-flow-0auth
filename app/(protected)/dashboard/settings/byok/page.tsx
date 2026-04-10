"use client"

import PageTitle from "@/components/page-title"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Key,
  Info,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Check,
  Loader2,
  MoreVertical,
  Edit,
  Power,
  Clock,
  Activity,
} from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { OpenAILogo } from "@/components/logos/openai-logo"
import { ClaudeLogo } from "@/components/logos/claude-logo"
import { OpenRouterLogo } from "@/components/logos/openrouter-logo"

export default function BYOKSettingsPage() {
  // Fetch user's API keys from Convex
  const userApiKeys = useQuery(api.userApiKeys.getUserApiKeys) || []

  // Mutations
  const storeApiKey = useMutation(api.userApiKeys.storeApiKey)
  const deleteApiKey = useMutation(api.userApiKeys.deleteApiKey)
  const toggleApiKey = useMutation(api.userApiKeys.toggleApiKey)
  const updateApiKey = useMutation(api.userApiKeys.updateApiKey)

  // State
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; keyId: Id<"userApiKeys"> | null; keyName: string }>({
    open: false,
    keyId: null,
    keyName: "",
  })
  const [editingModelFor, setEditingModelFor] = useState<Id<"userApiKeys"> | null>(null)
  const [editModelValue, setEditModelValue] = useState("")
  const [editModelList, setEditModelList] = useState<string[]>([])
  const [savingModelUpdate, setSavingModelUpdate] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<"openai" | "anthropic" | "openrouter">("openai")
  const [keyName, setKeyName] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [selectedModel, setSelectedModel] = useState("")
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [showKey, setShowKey] = useState(false)
  const [savingKey, setSavingKey] = useState(false)
  const [validatingKey, setValidatingKey] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)

  const providers = [
    {
      id: "openai",
      name: "OpenAI",
      description: "GPT-4, GPT-4o, GPT-3.5, and other OpenAI models",
      icon: <OpenAILogo className="h-5 w-5 text-[#10A37F]" />, // OpenAI brand green
      iconLarge: <OpenAILogo className="h-8 w-8 text-[#10A37F]" />,
      color: "text-[#10A37F]",
      bgColor: "bg-[#10A37F]/10",
      docs: "https://platform.openai.com/docs/quickstart",
      defaultModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    },
    {
      id: "anthropic",
      name: "Anthropic",
      description: "Claude 4.5 Sonnet, Claude 4.5 Haiku, and other Claude models",
      icon: <ClaudeLogo className="h-5 w-5" />, // Claude uses its own color internally
      iconLarge: <ClaudeLogo className="h-8 w-8" />,
      color: "text-[#C15F3C]",
      bgColor: "bg-[#C15F3C]/10",
      docs: "https://docs.anthropic.com/",
      defaultModels: ["claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001", "claude-opus-4-1-20250805"],
    },
    {
      id: "openrouter",
      name: "OpenRouter",
      description: "Access to multiple AI models through a single API",
      icon: <OpenRouterLogo className="h-5 w-5 text-purple-600" />,
      iconLarge: <OpenRouterLogo className="h-8 w-8 text-purple-600" />,
      color: "text-purple-600",
      bgColor: "bg-purple-600/10",
      docs: "https://openrouter.ai/docs",
      defaultModels: ["anthropic/claude-3.5-sonnet", "openai/gpt-4o", "google/gemini-pro-1.5"],
    },
  ]

  // Load available models when provider changes
  useEffect(() => {
    const provider = providers.find(p => p.id === selectedProvider)
    if (provider) {
      setAvailableModels(provider.defaultModels)
      setSelectedModel(provider.defaultModels[0])
    }
  }, [selectedProvider])

  // Fetch models from API when user has entered a key
  const fetchModels = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key first")
      return
    }

    setLoadingModels(true)
    try {
      const response = await fetch(
        `/api/byok/models?provider=${selectedProvider}&apiKey=${encodeURIComponent(apiKey)}${baseUrl ? `&baseUrl=${encodeURIComponent(baseUrl)}` : ''}`
      )

      if (response.ok) {
        const data = await response.json()
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models)
          setSelectedModel(data.models[0])
          toast.success(`Found ${data.models.length} available models`)
        }
      } else {
        toast.error("Failed to fetch models. Using default list.")
      }
    } catch (error) {
      console.error('Error fetching models:', error)
      toast.error("Failed to fetch models. Using default list.")
    } finally {
      setLoadingModels(false)
    }
  }

  const validateApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key")
      return false
    }

    setValidatingKey(true)
    try {
      const response = await fetch('/api/byok/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (data.valid) {
        toast.success("API key is valid!")

        // Update available models if provided
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models)
          if (!selectedModel || !data.models.includes(selectedModel)) {
            setSelectedModel(data.models[0])
          }
        }

        return true
      } else {
        toast.error(data.error || "Invalid API key")
        return false
      }
    } catch (error) {
      console.error('Error validating API key:', error)
      toast.error("Failed to validate API key")
      return false
    } finally {
      setValidatingKey(false)
    }
  }

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!keyName.trim()) {
      toast.error("Please enter a key name")
      return
    }

    if (!apiKey.trim()) {
      toast.error("Please enter your API key")
      return
    }

    if (!selectedModel) {
      toast.error("Please select a model")
      return
    }

    setSavingKey(true)
    try {
      // Validate the key first
      const isValid = await validateApiKey()
      if (!isValid) {
        setSavingKey(false)
        return
      }

      // Save to Convex
      await storeApiKey({
        keyName: keyName.trim(),
        provider: selectedProvider,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined,
        modelId: selectedModel,
        isActive: true,
      })

      setKeyName("")
      setApiKey("")
      setBaseUrl("")
      setShowAddForm(false)
      toast.success(`API key "${keyName}" added successfully`)
    } catch (error: any) {
      console.error('Error adding API key:', error)
      toast.error(error.message || 'Failed to add API key')
    } finally {
      setSavingKey(false)
    }
  }

  const openDeleteDialog = (keyId: Id<"userApiKeys">, keyName: string) => {
    setDeleteDialog({ open: true, keyId, keyName })
  }

  const handleDeleteKey = async () => {
    if (!deleteDialog.keyId) return

    try {
      await deleteApiKey({ keyId: deleteDialog.keyId })
      toast.success(`API key "${deleteDialog.keyName}" deleted`)
      setDeleteDialog({ open: false, keyId: null, keyName: "" })
    } catch (error) {
      console.error('Error deleting API key:', error)
      toast.error('Failed to delete API key')
    }
  }

  const startEditModel = async (keyId: Id<"userApiKeys">, currentModel: string, provider: string) => {
    setEditingModelFor(keyId)
    setEditModelValue(currentModel)

    // Load available models for this provider
    const providerData = providers.find(p => p.id === provider)
    if (providerData) {
      setEditModelList(providerData.defaultModels)
    }
  }

  const handleUpdateModel = async (keyId: Id<"userApiKeys">, keyName: string) => {
    if (!editModelValue) {
      toast.error("Please select a model")
      return
    }

    setSavingModelUpdate(true)
    try {
      await updateApiKey({
        keyId,
        modelId: editModelValue,
      })
      toast.success(`Model updated for "${keyName}"`)
      setEditingModelFor(null)
    } catch (error) {
      console.error('Error updating model:', error)
      toast.error('Failed to update model')
    } finally {
      setSavingModelUpdate(false)
    }
  }

  const handleToggleKey = async (keyId: Id<"userApiKeys">, keyName: string) => {
    try {
      await toggleApiKey({ keyId })
      toast.success(`API key "${keyName}" toggled`)
    } catch (error) {
      console.error('Error toggling API key:', error)
      toast.error('Failed to toggle API key')
    }
  }

  const handleCopyKey = (keyPreview: string) => {
    navigator.clipboard.writeText(keyPreview)
    toast.success('Key preview copied to clipboard')
  }

  return (
    <div className="max-w-full overflow-x-hidden">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <PageTitle title="Bring Your Own Key (BYOK)" />
          <p className="text-sm text-muted-foreground">
            Use your own API keys for AI models - No coins required!
          </p>
        </div>
      </div>

      <div className="space-y-6 max-w-full">
        {/* Overview Card */}
        <Card>
          <CardHeader>
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Key className="h-6 w-6 text-amber-500" />
                </div>
                API Key Management
              </CardTitle>
              <CardDescription>
                Add your own API keys to use with various AI models and services
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Security Notice</AlertTitle>
              <AlertDescription>
                Your API keys are encrypted and stored securely. Keys are validated before saving.
              </AlertDescription>
            </Alert>

            {userApiKeys.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Your API Keys</h3>
                  <Badge variant="secondary" className="text-xs">
                    {userApiKeys.length} {userApiKeys.length === 1 ? 'Key' : 'Keys'}
                  </Badge>
                </div>

                <div className="grid gap-4">
                  {userApiKeys.map((key) => {
                    const provider = providers.find(p => p.id === key.provider);
                    const isEditing = editingModelFor === key._id;

                    return (
                      <Card key={key._id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-0">
                          <div className="p-5 space-y-4">
                            {/* Header Section */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4 flex-1 min-w-0">
                                {/* Provider Icon */}
                                <div className={`p-3 rounded-xl ${provider?.bgColor || 'bg-muted'} flex-shrink-0 shadow-sm`}>
                                  {provider?.iconLarge || <Key className="h-8 w-8" />}
                                </div>

                                {/* Key Info */}
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-semibold text-lg truncate">{key.keyName}</h4>
                                    {key.isActive ? (
                                      <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/10 border-green-200">
                                        <Check className="h-3 w-3 mr-1" />
                                        Active
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-muted-foreground">
                                        Inactive
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 text-sm">
                                    <span className={`font-semibold ${provider?.color || ''}`}>
                                      {provider?.name || key.provider}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Actions Dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="flex-shrink-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => handleToggleKey(key._id, key.keyName)}>
                                    <Power className="h-4 w-4 mr-2" />
                                    {key.isActive ? 'Deactivate' : 'Activate'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => startEditModel(key._id, key.modelId, key.provider)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Change Model
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCopyKey(key.maskedApiKey)}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Key Preview
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openDeleteDialog(key._id, key.keyName)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Key
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Model Selection / Display */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                Model
                              </Label>
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <Select value={editModelValue} onValueChange={setEditModelValue}>
                                    <SelectTrigger className="flex-1">
                                      <SelectValue placeholder="Select model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {editModelList.map((model) => (
                                        <SelectItem key={model} value={model}>
                                          {model}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateModel(key._id, key.keyName)}
                                    disabled={savingModelUpdate}
                                  >
                                    {savingModelUpdate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingModelFor(null)}
                                    disabled={savingModelUpdate}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded-md flex-1 truncate">
                                    {key.modelId}
                                  </code>
                                </div>
                              )}
                            </div>

                            {/* API Key Preview */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                API Key
                              </Label>
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono bg-muted/60 px-3 py-2 rounded-md flex-1 text-muted-foreground truncate">
                                  {key.maskedApiKey}
                                </code>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="flex-shrink-0 h-9 w-9"
                                  onClick={() => handleCopyKey(key.maskedApiKey)}
                                  title="Copy preview"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Usage Stats */}
                            {key.lastUsed && (
                              <div className="pt-3 border-t">
                                <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Last used: {new Date(key.lastUsed).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Activity className="h-3.5 w-3.5" />
                                    <span>Used {key.usageCount || 0} {(key.usageCount || 0) === 1 ? 'time' : 'times'}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {!showAddForm ? (
              <Button onClick={() => setShowAddForm(true)} className="w-full gap-2">
                <Key className="h-4 w-4" />
                Add New API Key
              </Button>
            ) : (
              <form onSubmit={handleAddKey} className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="key-name" className="font-medium">
                    Key Name
                  </Label>
                  <Input
                    id="key-name"
                    placeholder="e.g., My OpenAI API Key"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    disabled={savingKey}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="font-medium text-base">Select Provider</Label>

                  {/* Provider Selection Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {providers.map((provider) => (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => setSelectedProvider(provider.id as any)}
                        className={`
                          relative p-4 rounded-lg border-2 transition-all text-left
                          hover:shadow-md hover:scale-[1.02]
                          ${selectedProvider === provider.id
                            ? `${provider.bgColor} border-current ${provider.color} shadow-sm`
                            : 'border-muted bg-muted/30 hover:bg-muted/50'
                          }
                        `}
                      >
                        <div className="flex flex-col items-center gap-2 text-center">
                          <div className={`p-2 rounded-lg ${selectedProvider === provider.id ? 'bg-background/50' : 'bg-background/80'}`}>
                            {provider.iconLarge}
                          </div>
                          <div>
                            <p className={`font-semibold text-sm ${selectedProvider === provider.id ? provider.color : ''}`}>
                              {provider.name}
                            </p>
                          </div>
                        </div>

                        {/* Selected indicator */}
                        {selectedProvider === provider.id && (
                          <div className={`absolute top-2 right-2 ${provider.color}`}>
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Provider Description */}
                  <div className={`p-3 rounded-lg ${providers.find(p => p.id === selectedProvider)?.bgColor} border`}>
                    <p className="text-sm text-muted-foreground">
                      {providers.find(p => p.id === selectedProvider)?.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="api-key" className="font-medium">
                      API Key
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowKey(!showKey)}
                      className="h-6 w-6 p-0"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Input
                    id="api-key"
                    type={showKey ? "text" : "password"}
                    placeholder="Paste your API key here"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={savingKey}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base-url" className="font-medium">
                    Base URL (Optional)
                  </Label>
                  <Input
                    id="base-url"
                    type="text"
                    placeholder="e.g., https://api.openai.com/v1"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    disabled={savingKey}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use the default endpoint
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="model" className="font-medium">
                      Default Model
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={fetchModels}
                      disabled={loadingModels || !apiKey.trim()}
                    >
                      {loadingModels ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Fetch Models"
                      )}
                    </Button>
                  </div>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={savingKey || validatingKey}
                    className="flex-1 gap-2"
                  >
                    {savingKey || validatingKey ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {validatingKey ? "Validating..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4" />
                        Add Key
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false)
                      setKeyName("")
                      setApiKey("")
                      setBaseUrl("")
                      setShowKey(false)
                    }}
                    disabled={savingKey}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Supported Providers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Supported Providers</CardTitle>
            <CardDescription>
              Choose the provider that matches your API credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className={`rounded-lg border-2 p-5 hover:shadow-lg transition-all hover:scale-[1.02] ${provider.bgColor}`}
                >
                  <div className="space-y-3">
                    {/* Provider Header */}
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg bg-background/80 shadow-sm`}>
                        {provider.iconLarge}
                      </div>
                      <div>
                        <h3 className={`font-bold text-lg ${provider.color}`}>
                          {provider.name}
                        </h3>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {provider.description}
                    </p>

                    {/* Documentation Link */}
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className={`w-full justify-start gap-2 ${provider.color} hover:${provider.bgColor}`}
                    >
                      <a href={provider.docs} target="_blank" rel="noopener noreferrer">
                        <span className="flex-1 text-left">View Documentation</span>
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Benefits Card */}
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
              <Info className="h-5 w-5" />
              Benefits of BYOK
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-green-900 dark:text-green-100">
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>No coins required</strong> - Use AI features without spending study coins</li>
              <li><strong>Full control</strong> - Manage your own API usage and costs</li>
              <li><strong>No rate limits</strong> - Your keys, your limits</li>
              <li><strong>Multiple providers</strong> - Use OpenAI, Anthropic, or OpenRouter</li>
              <li><strong>Secure storage</strong> - Keys are encrypted with AES-256-GCM</li>
              <li><strong>Automatic fallback</strong> - Platform keys used if BYOK fails</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteDialog.keyName}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Deleting this API key will remove it permanently. You&apos;ll need to add it again if you want to use it in the future.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, keyId: null, keyName: "" })}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteKey}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
