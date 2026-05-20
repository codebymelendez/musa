const fs = require('fs');
const files = [
  'src/app/client/page.tsx',
  'src/app/loyalty/page.tsx',
  'src/components/loyalty/LoyaltyProgramForm.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  // First, inject the heroicons import if it doesn't exist
  if (!content.includes('@heroicons/react')) {
    content = content.replace(
      '"use client";\n',
      '"use client";\n\nimport { CalendarDaysIcon, MagnifyingGlassIcon, TagIcon, QrCodeIcon, ArrowPathIcon, PencilSquareIcon, HomeIcon, ArrowRightOnRectangleIcon, StarIcon, Cog6ToothIcon, UserMinusIcon } from "@heroicons/react/24/outline";\n'
    );
  }

  // Replace each icon
  content = content.replace(/<span className="material-symbols-outlined"[^>]*>calendar_today<\/span>/g, '<CalendarDaysIcon className="w-5 h-5" />');
  content = content.replace(/<span className="material-symbols-outlined text-sm">search<\/span>/g, '<MagnifyingGlassIcon className="w-4 h-4" />');
  content = content.replace(/<span className="material-symbols-outlined absolute left-3 top-1\/2 -translate-y-1\/2 text-on-surface-variant text-sm">\s*search\s*<\/span>/g, '<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />');
  content = content.replace(/<span className="material-symbols-outlined text-sm">local_offer<\/span>/g, '<TagIcon className="w-4 h-4" />');
  content = content.replace(/<span className="material-symbols-outlined text-sm">qr_code<\/span>/g, '<QrCodeIcon className="w-4 h-4" />');
  content = content.replace(/<span className="material-symbols-outlined text-white text-xl"[^>]*>stars<\/span>/g, '<StarIcon className="w-5 h-5 text-white" />');
  content = content.replace(/<span className="material-symbols-outlined text-sm animate-spin">progress_activity<\/span>/g, '<ArrowPathIcon className="w-4 h-4 animate-spin" />');
  content = content.replace(/<span className="material-symbols-outlined text-sm">edit_calendar<\/span>/g, '<PencilSquareIcon className="w-4 h-4" />');
  content = content.replace(/<span className="material-symbols-outlined text-sm">calendar_add_on<\/span>/g, '<CalendarDaysIcon className="w-4 h-4" />');
  content = content.replace(/<span className="material-symbols-outlined mb-1 text-\[24px\]">home<\/span>/g, '<HomeIcon className="w-6 h-6 mb-1" />');
  content = content.replace(/<span className="material-symbols-outlined mb-1 text-\[24px\]">search<\/span>/g, '<MagnifyingGlassIcon className="w-6 h-6 mb-1" />');
  content = content.replace(/<span className="material-symbols-outlined mb-1 text-\[24px\]"[^>]*>calendar_today<\/span>/g, '<CalendarDaysIcon className="w-6 h-6 mb-1" />');
  content = content.replace(/<span className="material-symbols-outlined mb-1 text-\[24px\]">logout<\/span>/g, '<ArrowRightOnRectangleIcon className="w-6 h-6 mb-1" />');
  
  // loyalty specifics
  content = content.replace(/<span[^>]*>\s*loyalty\s*<\/span>/g, '<TagIcon className="w-12 h-12 text-on-surface-variant mx-auto" />');
  content = content.replace(/<span className="material-symbols-outlined text-sm">settings<\/span>/g, '<Cog6ToothIcon className="w-4 h-4" />');
  content = content.replace(/<span className="material-symbols-outlined text-sm">qr_code_scanner<\/span>/g, '<QrCodeIcon className="w-5 h-5" />');
  content = content.replace(/<span className="material-symbols-outlined animate-spin text-sm">progress_activity<\/span>/g, '<ArrowPathIcon className="w-5 h-5 animate-spin" />');
  content = content.replace(/<span className="material-symbols-outlined text-4xl">person_off<\/span>/g, '<UserMinusIcon className="w-10 h-10 mx-auto text-on-surface-variant" />');

  // form specifics
  content = content.replace(/<span className="w-5 h-5 rounded bg-surface-container-highest">\s*event\s*<\/span>/g, '<CalendarDaysIcon className="w-5 h-5 p-0.5 rounded bg-surface-container-highest" />');
  content = content.replace(/<span className="w-5 h-5 rounded bg-surface-container-highest">\s*stars\s*<\/span>/g, '<StarIcon className="w-5 h-5 p-0.5 rounded bg-surface-container-highest" />');

  fs.writeFileSync(file, content);
}
console.log('Icons replaced successfully.');
