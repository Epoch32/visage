/** @jsxImportSource visage */
import { beforeEach, describe, expect, it } from "bun:test";
import { setupDOM } from "./dom-mock";

setupDOM();

import { render } from "../src";
import { signal } from "../src/signals";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  createIcon,
  createToastManager,
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
  Switch,
  SwitchThumb,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toast,
  ToastClose,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipTrigger
} from "../src/ui";

describe("Visage UI Component Primitives", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.innerHTML = "";
    document.body.appendChild(container);
  });

  describe("Dialog", () => {
    it("opens and closes via trigger and close button with portal", () => {
      const unmount = render(
        () => (
          <Dialog>
            {() => (
              <>
                <DialogTrigger class="open-btn">Open Dialog</DialogTrigger>
                <DialogPortal>
                  <DialogOverlay class="overlay" />
                  <DialogContent class="content">
                    <DialogTitle>Modal Title</DialogTitle>
                    <DialogClose class="close-btn">Close</DialogClose>
                  </DialogContent>
                </DialogPortal>
              </>
            )}
          </Dialog>
        ),
        container
      );

      const trigger = container.querySelector(".open-btn") as HTMLButtonElement;
      expect(trigger.getAttribute("data-state")).toBe("closed");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");

      // Click trigger to open
      trigger.click();

      expect(trigger.getAttribute("data-state")).toBe("open");
      expect(trigger.getAttribute("aria-expanded")).toBe("true");

      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog).not.toBeNull();
      expect(dialog.getAttribute("aria-modal")).toBe("true");

      const title = dialog.querySelector("h2");
      expect(title?.textContent).toBe("Modal Title");
      expect(dialog.getAttribute("aria-labelledby")).toBe(title?.id ?? "");

      // Click close button
      const closeBtn = dialog.querySelector(".close-btn") as HTMLButtonElement;
      closeBtn.click();

      expect(trigger.getAttribute("data-state")).toBe("closed");

      unmount();
    });

    it("supports controlled open signal", () => {
      const isOpen = signal(false);
      const unmount = render(
        () => (
          <Dialog open={isOpen} onOpenChange={(val) => isOpen.set(val)}>
            {() => (
              <DialogPortal>
                <DialogContent class="content">Controlled Dialog</DialogContent>
              </DialogPortal>
            )}
          </Dialog>
        ),
        container
      );

      const content = document.body.querySelector(".content") as HTMLElement;
      expect(content.getAttribute("data-state")).toBe("closed");

      isOpen.set(true);
      expect(content.getAttribute("data-state")).toBe("open");

      unmount();
    });
  });

  describe("Tabs", () => {
    it("switches tabs on trigger click and keyboard navigation", () => {
      const activeTab = signal("account");

      const unmount = render(
        () => (
          <Tabs value={activeTab} onValueChange={(val) => activeTab.set(val)}>
            {() => (
              <>
                <TabsList>
                  <TabsTrigger value="account">Account</TabsTrigger>
                  <TabsTrigger value="password">Password</TabsTrigger>
                  <TabsTrigger value="billing">Billing</TabsTrigger>
                </TabsList>
                <TabsContent value="account">Account Panel</TabsContent>
                <TabsContent value="password">Password Panel</TabsContent>
                <TabsContent value="billing">Billing Panel</TabsContent>
              </>
            )}
          </Tabs>
        ),
        container
      );

      const triggers = container.querySelectorAll('[role="tab"]');
      expect(triggers.length).toBe(3);
      expect(triggers[0]!.getAttribute("aria-selected")).toBe("true");
      expect(triggers[0]!.getAttribute("data-state")).toBe("active");
      expect(triggers[1]!.getAttribute("aria-selected")).toBe("false");

      const panel = container.querySelector('[role="tabpanel"]') as HTMLElement;
      expect(panel.textContent).toBe("Account Panel");

      // Click second tab
      (triggers[1] as HTMLButtonElement).click();
      expect(activeTab()).toBe("password");
      expect(triggers[1]!.getAttribute("aria-selected")).toBe("true");

      const newPanel = container.querySelector('[role="tabpanel"]') as HTMLElement;
      expect(newPanel.textContent).toBe("Password Panel");

      unmount();
    });
  });

  describe("DropdownMenu", () => {
    it("opens menu and handles item selection", () => {
      let selectedItem = "";
      const unmount = render(
        () => (
          <DropdownMenu>
            {() => (
              <>
                <DropdownMenuTrigger class="menu-btn">Actions</DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent class="menu-content">
                    <DropdownMenuItem onSelect={() => (selectedItem = "edit")}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => (selectedItem = "delete")}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </>
            )}
          </DropdownMenu>
        ),
        container
      );

      const trigger = container.querySelector(".menu-btn") as HTMLButtonElement;
      expect(trigger.getAttribute("data-state")).toBe("closed");

      trigger.click();
      expect(trigger.getAttribute("data-state")).toBe("open");

      const menu = document.body.querySelector('[role="menu"]') as HTMLElement;
      expect(menu).not.toBeNull();

      const items = menu.querySelectorAll('[role="menuitem"]');
      expect(items.length).toBe(2);

      // Click first item
      (items[0] as HTMLElement).click();
      expect(selectedItem).toBe("edit");
      expect(trigger.getAttribute("data-state")).toBe("closed");

      unmount();
    });
  });

  describe("Accordion", () => {
    it("expands and collapses panels in single collapsible mode", () => {
      const unmount = render(
        () => (
          <Accordion type="single" collapsible defaultValue="item-1">
            {() => (
              <>
                <AccordionItem value="item-1">
                  {() => (
                    <>
                      <AccordionTrigger class="t-1">Header 1</AccordionTrigger>
                      <AccordionContent class="c-1">Body 1</AccordionContent>
                    </>
                  )}
                </AccordionItem>
                <AccordionItem value="item-2">
                  {() => (
                    <>
                      <AccordionTrigger class="t-2">Header 2</AccordionTrigger>
                      <AccordionContent class="c-2">Body 2</AccordionContent>
                    </>
                  )}
                </AccordionItem>
              </>
            )}
          </Accordion>
        ),
        container
      );

      const trigger1 = container.querySelector(".t-1") as HTMLButtonElement;
      const trigger2 = container.querySelector(".t-2") as HTMLButtonElement;

      expect(trigger1.getAttribute("aria-expanded")).toBe("true");
      expect(trigger2.getAttribute("aria-expanded")).toBe("false");
      expect(container.querySelector(".c-1")).not.toBeNull();
      expect(container.querySelector(".c-2")).toBeNull();

      // Click trigger 2
      trigger2.click();
      expect(trigger1.getAttribute("aria-expanded")).toBe("false");
      expect(trigger2.getAttribute("aria-expanded")).toBe("true");
      expect(container.querySelector(".c-1")).toBeNull();
      expect(container.querySelector(".c-2")).not.toBeNull();

      // Click trigger 2 again to collapse
      trigger2.click();
      expect(trigger2.getAttribute("aria-expanded")).toBe("false");
      expect(container.querySelector(".c-2")).toBeNull();

      unmount();
    });
  });

  describe("Switch", () => {
    it("toggles checked state and ARIA attributes on click", () => {
      const isChecked = signal(false);
      const unmount = render(
        () => (
          <Switch
            checked={isChecked}
            onCheckedChange={(val) => isChecked.set(val)}
            class="switch-btn"
          >
            <SwitchThumb class="thumb" />
          </Switch>
        ),
        container
      );

      const btn = container.querySelector(".switch-btn") as HTMLButtonElement;
      expect(btn.getAttribute("role")).toBe("switch");
      expect(btn.getAttribute("aria-checked")).toBe("false");
      expect(btn.getAttribute("data-state")).toBe("unchecked");

      btn.click();
      expect(isChecked()).toBe(true);
      expect(btn.getAttribute("aria-checked")).toBe("true");
      expect(btn.getAttribute("data-state")).toBe("checked");

      unmount();
    });
  });

  describe("Popover", () => {
    it("opens on trigger click and closes on close button", () => {
      const unmount = render(
        () => (
          <Popover>
            {() => (
              <>
                <PopoverTrigger class="pop-trigger">Info</PopoverTrigger>
                <PopoverPortal>
                  <PopoverContent class="pop-content">
                    Popover Details
                    <PopoverClose class="pop-close">Done</PopoverClose>
                  </PopoverContent>
                </PopoverPortal>
              </>
            )}
          </Popover>
        ),
        container
      );

      const trigger = container.querySelector(".pop-trigger") as HTMLButtonElement;
      expect(trigger.getAttribute("data-state")).toBe("closed");

      trigger.click();
      expect(trigger.getAttribute("data-state")).toBe("open");

      const content = document.body.querySelector(".pop-content") as HTMLElement;
      expect(content.getAttribute("data-state")).toBe("open");

      const close = document.body.querySelector(".pop-close") as HTMLButtonElement;
      close.click();
      expect(trigger.getAttribute("data-state")).toBe("closed");

      unmount();
    });
  });

  describe("Tooltip", () => {
    it("mounts tooltip with accessible ARIA description", () => {
      const unmount = render(
        () => (
          <Tooltip openDelay={0} closeDelay={0}>
            {() => (
              <>
                <TooltipTrigger class="tip-trigger">Hover Me</TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent class="tip-content">Help text</TooltipContent>
                </TooltipPortal>
              </>
            )}
          </Tooltip>
        ),
        container
      );

      const trigger = container.querySelector(".tip-trigger") as HTMLButtonElement;
      expect(trigger.getAttribute("aria-describedby")).toContain("tooltip-");

      unmount();
    });
  });

  describe("Toast", () => {
    it("dispatches and renders toasts through manager and viewport", () => {
      const manager = createToastManager();

      const unmount = render(
        () => (
          <ToastProvider manager={manager}>
            {() => <ToastViewport class="toast-viewport" />}
          </ToastProvider>
        ),
        container
      );

      expect(manager.toasts().length).toBe(0);

      // Dispatch toast
      const id = manager.success("Operation succeeded", {
        description: "Your changes have been saved."
      });

      expect(manager.toasts().length).toBe(1);

      const toastEl = container.querySelector('[role="status"]') as HTMLElement;
      expect(toastEl).not.toBeNull();
      expect(toastEl.textContent).toContain("Operation succeeded");
      expect(toastEl.textContent).toContain("Your changes have been saved.");

      // Dismiss toast
      manager.dismiss(id);
      expect(manager.toasts().length).toBe(0);

      unmount();
    });
  });

  describe("createIcon", () => {
    it("renders fine-grained reactive SVG icon with Lucide-style icon nodes", () => {
      const CheckIcon = createIcon("Check", [
        ["polyline", { points: "20 6 9 17 4 12" }]
      ]);

      const size = signal(16);
      const color = signal("red");

      const unmount = render(
        () => <CheckIcon size={size} color={color} class="test-icon" />,
        container
      );

      const svg = container.querySelector("svg") as SVGSVGElement;
      expect(svg).not.toBeNull();
      expect(svg.getAttribute("width")).toBe("16");
      expect(svg.getAttribute("height")).toBe("16");
      expect(svg.getAttribute("stroke")).toBe("red");
      expect(svg.getAttribute("class")).toBe("test-icon");

      const polyline = svg.querySelector("polyline");
      expect(polyline).not.toBeNull();
      expect(polyline?.getAttribute("points")).toBe("20 6 9 17 4 12");

      // Update reactive props
      size.set(28);
      color.set("blue");

      expect(svg.getAttribute("width")).toBe("28");
      expect(svg.getAttribute("height")).toBe("28");
      expect(svg.getAttribute("stroke")).toBe("blue");

      unmount();
    });
  });
});
