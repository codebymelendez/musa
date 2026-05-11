# MUSA Design Rules & Visual System

Este documento define las directrices visuales absolutas y congeladas de MUSA. 
**El sistema visual está SELLADO.** No se deben introducir nuevas direcciones de branding, cosméticos ad hoc ni librerías adicionales. Toda nueva funcionalidad debe construirse usando estrictamente este set de reglas.

---

## 1. Reglas Intocables del Sistema

### 1.1 Tipografía y Pesos
- **Cormorant (Editorial):** Se usa exclusivamente en `font-normal` para momentos editoriales, encabezados principales (`h1`) y pantallas de bienvenida.
- **DM Sans (UI Base):** Fuente principal de la interfaz (`font-ui`).
  - 🛑 **PROHIBIDO:** Usar `font-semibold`, `font-bold`, `font-extrabold` o `font-black`.
  - ✅ **PERMITIDO:** La jerarquía se construye con tamaño, color (`text-on-surface` vs `text-on-surface-variant`), y como máximo `font-medium`.
- **DM Mono (Numéricos):** Todos los números (precios, horas, estadísticas, contadores) DEBEN llevar la clase abstracta `.font-mono-num`.

### 1.2 Componentes y Formularios
- **Labels:** Deben usar siempre la clase `.musa-sublabel`. Nunca crear estilos en línea para etiquetas.
- **Inputs & Textareas:** Deben usar la clase `.musa-input`.
- **CTAs Primarias:** Único formato aceptado: `bg-primary text-on-primary shadow-primary-sm rounded-full font-medium`.
- **Contenedores y Bento Grids (Quiet Containers):** 
  - Usar `bg-surface` o `bg-surface-raised` con bordes sutiles `border border-outline-variant/30`.
  - Radios estándar: `rounded-2xl` o `rounded-xl`.
  - 🛑 **PROHIBIDO:** Sombras genéricas agresivas (`shadow-md`, `shadow-lg`, `shadow-xl`).

### 1.3 Iconografía y Carga
- **Iconos:** Uso **exclusivo** de `@heroicons/react/24/outline` o `solid`.
  - 🛑 **PROHIBIDO:** Usar `material-symbols-outlined`.
- **Carga (Loading States):** Preferir Skeletons (`animate-pulse` con fondos tenues) sobre Spinners rotativos siempre que la estructura de la página sea conocida.

### 1.4 Prohibiciones Estéticas Absolutas
- ❌ Cero gradientes (`bg-gradient-to-*`). MUSA usa colores sólidos y claros.
- ❌ Cero componentes o estética "SaaS Genérico" o "Panel de Administración Frío".
- ❌ Cero tokens y elevaciones Material Design 3 (MD3).

---

## 2. Comandos de Validación Técnica (Pre-Merge)

Antes de hacer merge a la rama principal, se debe verificar que no existan regresiones visuales. Ejecuta estos comandos en tu terminal (adaptados para entornos bash/PowerShell según aplique). Todos deben devolver **0 resultados**.

```bash
# Validar contaminación de pesos tipográficos pesados en UI (excepto casos editoriales aislados en marketing)
grep -r -E "font-(semibold|bold|extrabold|black)" src/components/ src/app/

# Validar contaminación de gradientes
grep -r "bg-gradient" src/

# Validar contaminación iconográfica
grep -r "material-symbols" src/

# Validar contaminación de sombras no semánticas
grep -r -E "shadow-(md|lg|xl|2xl)" src/
```

---

## 3. Checklist Final de QA Visual

Al desarrollar o revisar una nueva pantalla, verifica estos puntos tanto en Desktop como en Mobile:

### 📱 Mobile QA
- [ ] **CTAs Reachability:** El botón principal (Bottom CTA) debe estar accesible en la zona inferior de la pantalla.
- [ ] **Fluid Scrolling:** Ausencia total de scroll horizontal involuntario.
- [ ] **Padding Global:** Respeto estricto a los márgenes laterales (`px-4` o `px-5` estándar).
- [ ] **Touch Targets:** Botones e inputs miden al menos `h-11` o `h-12` para ser tapeables cómodamente.

### 💻 Desktop QA
- [ ] **Max Widths:** Los formularios y configuraciones no se desbordan horizontalmente al 100% de la pantalla (deben estar contenidos en `max-w-xl`, `max-w-2xl` o usar columnas).
- [ ] **White Space:** Uso equilibrado del respiro visual. No comprimir componentes.
- [ ] **Bento Alignment:** Los grids (`grid-cols-1 md:grid-cols-2`) tienen `gap` uniforme y se alinean en sus bases.
- [ ] **Sticky Elements:** Los encabezados y Sidebars mantienen su posición limpia sin traslapar el z-index de los modales.

---
*MUSA Visual System - Locked & Sealed.*
