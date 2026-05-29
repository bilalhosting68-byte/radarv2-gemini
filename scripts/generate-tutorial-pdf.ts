import { mdToPdf } from 'md-to-pdf';
import fs from 'fs';
import path from 'path';

async function generateTutorialPDF() {
  const mdPath = path.join(process.cwd(), 'docs', 'MemeRadar_V2_Tutorial.md');
  const pdfPath = path.join(process.cwd(), 'docs', 'MemeRadar_V2_Tutorial.pdf');

  if (!fs.existsSync(mdPath)) {
    console.error('Markdown file not found at:', mdPath);
    process.exit(1);
  }

  try {
    const pdf = await mdToPdf({ path: mdPath }, {
      dest: pdfPath,
      pdf_options: {
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        displayHeaderFooter: true,
        headerTemplate: '<span style="color: transparent;"></span>',
        footerTemplate: '<div style="font-size: 10px; width: 100%; text-align: center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
      }
    });

    if (pdf) {
      console.log('PDF Tutorial generated at:', pdfPath);
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    process.exit(1);
  }
}

generateTutorialPDF();
