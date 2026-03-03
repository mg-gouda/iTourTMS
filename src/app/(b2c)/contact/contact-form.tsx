"use client";

import { useState } from "react";

export function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/b2c/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setStatus("sent");
        setForm({ name: "", email: "", phone: "", subject: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="pub-card p-8 text-center">
        <h3
          className="mb-2 text-xl font-bold text-[var(--pub-primary)]"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          Thank You!
        </h3>
        <p className="text-[var(--pub-muted-foreground)]">
          Your message has been received. We&apos;ll get back to you shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="pub-card space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pub-primary)]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email *</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pub-primary)]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pub-primary)]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Subject</label>
          <input
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pub-primary)]"
          />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Message *</label>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pub-primary)]"
        />
      </div>
      <button
        type="submit"
        disabled={status === "sending"}
        className="pub-btn pub-btn-primary"
      >
        {status === "sending" ? "Sending..." : "Send Message"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
      )}
    </form>
  );
}
