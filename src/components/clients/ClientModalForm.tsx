"use client";

import { useState, useRef } from "react";
import { Client } from "@/types";

interface Props {
  client?: Client | null;
  onClose: () => void;
  onSaved: () => void;
}

const SUGGESTED_TAGS = ["VIP", "Frecuente", "Referida", "Estudiante", "Nuevo cliente"];

export default function ClientModalForm({ client, onClose, onSaved }: Props) {
  const isEditing = !!client;

  const [name, setName]               = useState(client?.name ?? "");
  const [phone, setPhone]             = useState(client?.phone ?? "");
  const [email, setEmail]             = useState(client?.email ?? "");
  const [notes, setNotes]             = useState(client?.notes ?? "");
  const [preferences, setPreferences] = useState(client?.preferences ?? "");
  const [birthday, setBirthday]       = useState(client?.birthday?.split("T")[0] ?? "");
  const [tags, setTags]               = useState<string[]>(client?.tags ?? []);
  const [tagInput, setTagInput]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const phoneRef = useRef<HTMLInputElement>(null);

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    if (!phone.trim()) { setError("El teléfono es obligatorio para evitar duplicados"); return; }
    if (phone.trim().length < 7) { setError("Teléfono muy corto (mínimo 7 dígitos)"); return; }

    setError(null);
    setLoading(true);

    try {
      const payload = {
        name:        name.trim(),
        phone:       phone.trim(),
        email:       email.trim() || undefined,
        notes:       notes.trim() || undefined,
        preferences: preferences.trim() || undefined,
        birthday:    birthday || undefined,
        tags,
        isActive:    true,
      };

      const url    = isEditing ? `/api/clients/${client!.id}` : "/api/clients";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al guardar");
        return;
      }

      onSaved();
    } catch (err) {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-surface-container-lowest w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface-container-lowest/95 backdrop-blur-sm flex items-center gap-4 px-6 pt-6 pb-4 rounded-t-[2.5rem] z-20">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <div className="flex-1">
            <h2 className="font-headline text-xl font-bold text-on-surface leading-tight">
              {isEditing ? "Editar clienta" : "Nueva clienta"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors hidden sm:flex"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="px-8 pb-32 space-y-5">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-error-container rounded-xl text-on-error-container text-sm">
              <span className="material-symbols-outlined text-base mt-0.5 shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              Nombre completo <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="María García"
              className="w-full h-12 px-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/40 text-sm"
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              Teléfono <span className="text-error">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50 text-xl">phone</span>
              <input
                ref={phoneRef}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+58 412 123 4567"
                className="w-full h-12 pl-11 pr-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/40 text-sm"
              />
            </div>
            <p className="text-xs text-on-surface-variant/60">
              Se usa para evitar clientas duplicadas en tu negocio
            </p>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              Email <span className="text-on-surface-variant/40 font-normal normal-case tracking-normal">(opcional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50 text-xl">mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maria@email.com"
                className="w-full h-12 pl-11 pr-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/40 text-sm"
              />
            </div>
          </div>

          {/* Cumpleaños */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              Cumpleaños <span className="text-on-surface-variant/40 font-normal normal-case tracking-normal">(opcional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50 text-xl">cake</span>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full h-12 pl-11 pr-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface text-sm"
              />
            </div>
          </div>

          {/* Etiquetas */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Etiquetas</label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    tags.includes(tag)
                      ? "bg-primary text-on-primary shadow-sm"
                      : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  {tags.includes(tag) && <span className="mr-1">✓</span>}
                  {tag}
                </button>
              ))}
            </div>
            {/* Etiquetas activas personalizadas */}
            {tags.filter(t => !SUGGESTED_TAGS.includes(t)).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {tags.filter(t => !SUGGESTED_TAGS.includes(t)).map((tag) => (
                  <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-semibold">
                    {tag}
                    <button onClick={() => toggleTag(tag)} className="ml-0.5 hover:text-error">×</button>
                  </span>
                ))}
              </div>
            )}
            {/* Input etiqueta personalizada */}
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); }}}
                placeholder="Etiqueta personalizada..."
                className="flex-1 h-9 px-3 bg-surface-container-high rounded-xl text-xs border-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/40"
              />
              <button
                type="button"
                onClick={addCustomTag}
                className="px-3 h-9 bg-surface-container text-on-surface-variant text-xs rounded-xl hover:bg-primary/10 transition-colors"
              >
                + Añadir
              </button>
            </div>
          </div>

          {/* Preferencias */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              Preferencias
            </label>
            <textarea
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="Alérgica a gel UV, prefiere tonos nude..."
              rows={2}
              className="w-full px-4 py-3 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/40 resize-none text-sm"
            />
          </div>

          {/* Notas internas */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              Notas internas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Solo visible para el equipo..."
              rows={2}
              className="w-full px-4 py-3 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/40 resize-none text-sm"
            />
          </div>

          {/* Botones */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined">{isEditing ? "save" : "person_add"}</span>
                  {isEditing ? "Guardar cambios" : "Añadir clienta"}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full h-11 text-on-surface-variant text-sm font-medium hover:text-on-surface transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
