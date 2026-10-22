import { beforeEach, describe, expect, it } from "bun:test";
import { setupDOM } from "./dom-mock";

setupDOM();

import { createForm, render, Show, v } from "../src";

describe("Visage Reactive Forms & Validation", () => {
  let container: any;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  it("validates fields with built-in schema (v)", () => {
    const userSchema = v.object({
      username: v.string().min(3, "Too short"),
      email: v.string().email("Must be valid email"),
      age: v.number().min(18, "Must be 18+")
    });

    const form = createForm({
      initialValues: {
        username: "ab",
        email: "invalid-email",
        age: 15
      },
      schema: userSchema
    });

    expect(form.isValid()).toBe(false);
    expect(form.fields.username.error()).toBe("Too short");
    expect(form.fields.email.error()).toBe("Must be valid email");
    expect(form.fields.age.error()).toBe("Must be 18+");

    // Correct the values
    form.fields.username.value.set("alice");
    form.fields.email.value.set("alice@example.com");
    form.fields.age.value.set(25);

    expect(form.isValid()).toBe(true);
    expect(form.fields.username.error()).toBeNull();
    expect(form.fields.email.error()).toBeNull();
    expect(form.fields.age.error()).toBeNull();
  });

  it("integrates with Standard Schema v1 (ArkType / Zod / Valibot)", () => {
    // Standard Schema v1 specification mock
    const standardZodMock = {
      "~standard": {
        version: 1,
        vendor: "zod",
        validate: (data: any) => {
          if (!data.username || data.username.length < 4) {
            return {
              issues: [{ path: ["username"], message: "Standard schema: min 4 chars" }]
            };
          }
          return { value: data };
        }
      }
    };

    const form = createForm({
      initialValues: { username: "abc" },
      schema: standardZodMock as any
    });

    expect(form.isValid()).toBe(false);
    expect(form.fields.username.error()).toBe("Standard schema: min 4 chars");

    form.fields.username.value.set("validName");
    expect(form.isValid()).toBe(true);
    expect(form.fields.username.error()).toBeNull();
  });

  it("memoizes schema validation to run once per state update across all fields", () => {
    let validationCalls = 0;
    const trackingSchema = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (data: any) => {
          validationCalls++;
          const issues: any[] = [];
          if (!data.first) issues.push({ path: ["first"], message: "First required" });
          if (!data.last) issues.push({ path: ["last"], message: "Last required" });
          if (issues.length > 0) return { issues };
          return { value: data };
        }
      }
    };

    const form = createForm({
      initialValues: { first: "", last: "" },
      schema: trackingSchema as any
    });

    expect(validationCalls).toBe(0);

    const errFirst = form.fields.first.error();
    const errLast = form.fields.last.error();
    const allErrors = form.errors();
    const isValid = form.isValid();

    expect(errFirst).toBe("First required");
    expect(errLast).toBe("Last required");
    expect(allErrors).toEqual({ first: "First required", last: "Last required" });
    expect(isValid).toBe(false);

    // Schema validation ran only once for all fields combined
    expect(validationCalls).toBe(1);

    // Update one field
    form.fields.first.value.set("John");
    expect(form.fields.first.error()).toBeNull();
    expect(form.fields.last.error()).toBe("Last required");
    expect(form.isValid()).toBe(false);

    expect(validationCalls).toBe(2);
  });

  it("binds input elements reactively with form.bind()", () => {
    let submittedValues: any = null;

    const form = createForm({
      initialValues: {
        title: "",
        subscribe: false
      },
      schema: v.object({
        title: v.string().min(1, "Title required")
      }),
      onSubmit: (vals) => {
        submittedValues = vals;
      }
    });

    const unmount = render(
      () => (
        <form onSubmit={form.handleSubmit}>
          <input id="title-input" {...form.bind("title")} />
          <Show when={() => form.fields.title.error()}>
            <span class="error">{form.fields.title.error}</span>
          </Show>
          <button type="submit">Submit</button>
        </form>
      ),
      container
    );

    const input = container.querySelector("#title-input");
    expect(form.isDirty()).toBe(false);

    // Simulate user input
    input.value = "New Article";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(form.fields.title.value()).toBe("New Article");
    expect(form.isDirty()).toBe(true);
    expect(form.isValid()).toBe(true);

    // Submit form
    form.handleSubmit();
    expect(submittedValues).toEqual({ title: "New Article", subscribe: false });

    unmount();
  });

  it("validates binary files, blobs, and formData with v.file, v.blob, and v.formData", () => {
    const fileSchema = v.file({
      maxSize: 1024 * 1024,
      type: [".zip", "application/zip"]
    });

    const validZip = new File(["dummy content"], "bundle.zip", { type: "application/zip" });
    const res1 = fileSchema.validate(validZip);
    expect(res1.success).toBe(true);
    expect(res1.data).toBe(validZip);

    // Invalid extension/type
    const invalidFile = new File(["text content"], "script.sh", { type: "text/x-sh" });
    const res2 = fileSchema.validate(invalidFile);
    expect(res2.success).toBe(false);
    expect(res2.issues?.[0]?.message).toContain("does not match allowed patterns");

    // Oversized file
    const bigFile = new File([new Uint8Array(2 * 1024 * 1024)], "huge.zip", {
      type: "application/zip"
    });
    const res3 = fileSchema.validate(bigFile);
    expect(res3.success).toBe(false);
    expect(res3.issues?.[0]?.message).toContain("exceeds maximum allowed");

    // Optional file
    const optionalFileSchema = v.file().optional();
    expect(optionalFileSchema.validate(undefined).success).toBe(true);
    expect(optionalFileSchema.validate(null).success).toBe(true);

    // Blob schema
    const blobSchema = v.blob().max(500);
    const smallBlob = new Blob(["hello"], { type: "text/plain" });
    expect(blobSchema.validate(smallBlob).success).toBe(true);
    const bigBlob = new Blob([new Uint8Array(1000)], { type: "text/plain" });
    expect(blobSchema.validate(bigBlob).success).toBe(false);

    // FormData schema
    const fdSchema = v.formData();
    const fd = new FormData();
    fd.append("name", "visage");
    expect(fdSchema.validate(fd).success).toBe(true);
    expect(fdSchema.validate({ notFormData: true }).success).toBe(false);
  });
});
