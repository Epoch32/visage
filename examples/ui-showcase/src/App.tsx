/** @jsxImportSource visage */

import {
  Activity,
  Bell,
  Check,
  FileText,
  Folder,
  Heart,
  Layers,
  Moon,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Trash2
} from "lucide-react";
import { createSignal } from "visage";
import { Accordion, Dialog, DropdownMenu, Switch, Tabs, Toast, Tooltip, toast } from "visage/ui";

export function App() {
  const [notifications, setNotifications] = createSignal(true);
  const [darkMode, setDarkMode] = createSignal(true);
  const [likeCount, setLikeCount] = createSignal(42);
  const [isLiked, setIsLiked] = createSignal(false);

  const toggleLike = () => {
    if (isLiked()) {
      setIsLiked(false);
      setLikeCount(likeCount() - 1);
    } else {
      setIsLiked(true);
      setLikeCount(likeCount() + 1);
      toast({
        title: "Added to favorites",
        description: "You liked the Visage UI components showcase.",
        variant: "success"
      });
    }
  };

  return (
    <div class="container">
      <Toast.Provider>
        {() => (
          <>
            <header class="header">
              <div class="logo-group">
                <div class="logo-badge">VISAGE UI</div>
                <div>
                  <h1 class="title">Component & Lucide Showcase</h1>
                  <p class="subtitle">
                    Accessible, headless primitives powered by Visage signals & build-time Lucide
                    AST transforms
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
                <button
                  type="button"
                  class="btn btn-secondary"
                  onClick={toggleLike}
                  style={{ display: "inline-flex", "align-items": "center", gap: "6px" }}
                >
                  <Heart
                    size={16}
                    style={{
                      color: () => (isLiked() ? "#ef4444" : "currentColor"),
                      fill: () => (isLiked() ? "#ef4444" : "none")
                    }}
                  />
                  <span>{() => likeCount()}</span>
                </button>

                {/* Shorthand DropdownMenu */}
                <DropdownMenu
                  trigger={
                    <button
                      type="button"
                      class="btn btn-secondary"
                      style={{ display: "inline-flex", "align-items": "center", gap: "6px" }}
                    >
                      <Settings size={16} />
                      <span>Options</span>
                    </button>
                  }
                  contentClass="menu-content"
                  items={[
                    {
                      label: "Settings",
                      icon: <Settings size={14} />,
                      class: "menu-item",
                      onSelect: () =>
                        toast({
                          title: "Action triggered",
                          description: "Profile settings opened."
                        })
                    },
                    {
                      label: "Activity log",
                      icon: <Activity size={14} />,
                      class: "menu-item",
                      onSelect: () =>
                        toast({
                          title: "Activity log",
                          description: "No recent errors detected."
                        })
                    },
                    { separator: true, class: "menu-separator" },
                    {
                      label: "Delete All",
                      icon: <Trash2 size={14} />,
                      danger: true,
                      class: "menu-item",
                      onSelect: () =>
                        toast({
                          title: "Danger",
                          description: "Items cleared.",
                          variant: "error"
                        })
                    }
                  ]}
                />
              </div>
            </header>

            <main>
              {/* Tabs Section */}
              <section class="card">
                <h2 class="card-title">
                  <Layers size={20} />
                  <span>Interactive Primitives</span>
                </h2>

                <Tabs defaultValue="dialogs">
                  {() => (
                    <>
                      <Tabs.List class="tabs-list">
                        <Tabs.Trigger value="dialogs" class="tab-trigger">
                          <Shield size={16} />
                          <span>Dialog & Modals</span>
                        </Tabs.Trigger>
                        <Tabs.Trigger value="accordion" class="tab-trigger">
                          <Folder size={16} />
                          <span>Accordion</span>
                        </Tabs.Trigger>
                        <Tabs.Trigger value="switches" class="tab-trigger">
                          <Sparkles size={16} />
                          <span>Switches & Tooltips</span>
                        </Tabs.Trigger>
                      </Tabs.List>

                      {/* Dialog Tab */}
                      <Tabs.Content value="dialogs" class="tab-content">
                        <p style={{ "margin-bottom": "16px", color: "var(--fg-muted)" }}>
                          Dialogs support accessible focus trapping, keyboard esc dismissal,
                          backdrop clicks, and automatic portal rendering.
                        </p>

                        <div style={{ display: "flex", gap: "12px" }}>
                          {/* Shorthand Dialog */}
                          <Dialog
                            trigger={
                              <button
                                type="button"
                                class="btn"
                                style={{
                                  display: "inline-flex",
                                  "align-items": "center",
                                  gap: "6px"
                                }}
                              >
                                <Shield size={16} />
                                <span>Open Confirmation Modal</span>
                              </button>
                            }
                            title="Confirm Action"
                            description="This modal is automatically mounted into document body without requiring manual portal wrappers."
                            contentClass="dialog-content"
                            footer={
                              <div
                                style={{
                                  display: "flex",
                                  "justify-content": "flex-end",
                                  gap: "8px",
                                  "margin-top": "20px"
                                }}
                              >
                                <Dialog.Close class="btn btn-secondary">Cancel</Dialog.Close>
                                <Dialog.Close
                                  class="btn"
                                  onClick={() =>
                                    toast({
                                      title: "Confirmed",
                                      description: "Changes were successfully saved.",
                                      variant: "success"
                                    })
                                  }
                                >
                                  <Check size={16} />
                                  <span>Confirm</span>
                                </Dialog.Close>
                              </div>
                            }
                          >
                            <p style={{ color: "var(--fg-muted)", "font-size": "14px" }}>
                              Are you sure you want to proceed with this operation?
                            </p>
                          </Dialog>

                          <button
                            type="button"
                            class="btn btn-secondary"
                            onClick={() =>
                              toast({
                                title: "Notification",
                                description: "Triggered standard toast notification."
                              })
                            }
                          >
                            <Bell size={16} />
                            <span>Send Toast</span>
                          </button>
                        </div>
                      </Tabs.Content>

                      {/* Accordion Tab (Shorthand) */}
                      <Tabs.Content value="accordion" class="tab-content">
                        <Accordion
                          type="single"
                          collapsible
                          defaultValue="item-1"
                          itemClass="accordion-item"
                          triggerClass="accordion-trigger"
                          contentClass="accordion-content"
                          items={[
                            {
                              value: "item-1",
                              trigger: (
                                <span
                                  style={{
                                    display: "flex",
                                    "align-items": "center",
                                    gap: "8px"
                                  }}
                                >
                                  <FileText size={16} />
                                  <span>Zero Runtime Icon Overhead</span>
                                </span>
                              ),
                              content:
                                "With the visageLucide() Vite plugin, your icon imports are converted at build time into pure Visage SVG components. Only the icons you import are bundled, avoiding giant icon registries."
                            },
                            {
                              value: "item-2",
                              trigger: (
                                <span
                                  style={{
                                    display: "flex",
                                    "align-items": "center",
                                    gap: "8px"
                                  }}
                                >
                                  <Sparkles size={16} />
                                  <span>Fine-grained Reactivity</span>
                                </span>
                              ),
                              content:
                                "All state transitions run through Visage Signals with pinpoint DOM updates and zero virtual DOM diffing."
                            }
                          ]}
                        />
                      </Tabs.Content>

                      {/* Switches Tab (Shorthand) */}
                      <Tabs.Content value="switches" class="tab-content">
                        <div style={{ display: "flex", "flex-direction": "column", gap: "16px" }}>
                          <div
                            style={{
                              display: "flex",
                              "align-items": "center",
                              "justify-content": "space-between"
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                "align-items": "center",
                                gap: "8px"
                              }}
                            >
                              <Bell size={16} />
                              <span>Push Notifications</span>
                            </div>
                            <Switch
                              class="switch"
                              thumbClass="switch-thumb"
                              checked={notifications}
                              onCheckedChange={(val: boolean) => {
                                setNotifications(val);
                                toast({
                                  title: val ? "Notifications enabled" : "Notifications disabled",
                                  description: `Notifications are now ${val ? "on" : "off"}.`
                                });
                              }}
                            />
                          </div>

                          <div
                            style={{
                              display: "flex",
                              "align-items": "center",
                              "justify-content": "space-between"
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                "align-items": "center",
                                gap: "8px"
                              }}
                            >
                              {() => (darkMode() ? <Moon size={16} /> : <Sun size={16} />)}
                              <span>Dark Theme</span>
                            </div>
                            <Tooltip
                              content="Toggle between dark and light themes"
                              contentClass="tooltip-content"
                            >
                              <Switch
                                class="switch"
                                thumbClass="switch-thumb"
                                checked={darkMode}
                                onCheckedChange={(val: boolean) => setDarkMode(val)}
                              />
                            </Tooltip>
                          </div>
                        </div>
                      </Tabs.Content>
                    </>
                  )}
                </Tabs>
              </section>

              {/* Lucide Grid Section */}
              <section class="card">
                <h2 class="card-title">
                  <Sparkles size={20} />
                  <span>Lucide Icon Integration</span>
                </h2>
                <p style={{ color: "var(--fg-muted)", "margin-bottom": "16px" }}>
                  Native SVG rendering with stroke, size, and color customization directly via JSX
                  properties:
                </p>
                <div
                  style={{
                    display: "grid",
                    "grid-template-columns": "repeat(auto-fill, minmax(120px, 1fr))",
                    gap: "12px"
                  }}
                >
                  <div
                    class="btn btn-secondary"
                    style={{ "justify-content": "center", padding: "16px" }}
                  >
                    <Check size={24} color="#10b981" />
                  </div>
                  <div
                    class="btn btn-secondary"
                    style={{ "justify-content": "center", padding: "16px" }}
                  >
                    <Heart size={24} color="#ef4444" />
                  </div>
                  <div
                    class="btn btn-secondary"
                    style={{ "justify-content": "center", padding: "16px" }}
                  >
                    <Bell size={24} color="#f59e0b" />
                  </div>
                  <div
                    class="btn btn-secondary"
                    style={{ "justify-content": "center", padding: "16px" }}
                  >
                    <Activity size={24} color="#3b82f6" />
                  </div>
                  <div
                    class="btn btn-secondary"
                    style={{ "justify-content": "center", padding: "16px" }}
                  >
                    <Shield size={24} color="#8b5cf6" />
                  </div>
                  <div
                    class="btn btn-secondary"
                    style={{ "justify-content": "center", padding: "16px" }}
                  >
                    <Sparkles size={24} color="#ec4899" />
                  </div>
                </div>
              </section>
            </main>

            <Toast.Viewport class="toast-viewport" />
          </>
        )}
      </Toast.Provider>
    </div>
  );
}
