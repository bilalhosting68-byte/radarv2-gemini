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
    console.log('Generating PDF... (this may take a moment on VPS)');
    const pdf = await mdToPdf({ path: mdPath }, {
      dest: pdfPath,
      launch_options: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
      pdf_options: {
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: '<div style="font-size: 10px; width: 100%; text-align: center; font-family: sans-serif;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
      }
    });

    if (pdf) {
      console.log('PDF Tutorial generated successfully at:', pdfPath);
      if (fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 0) {
        console.log('Validation: PDF exists and size > 0');
      } else {
        console.error('Validation FAILED: PDF is empty or missing');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    console.log('\nHINT: If you are on a VPS, try running: npx puppeteer browsers install chrome');
    process.exit(1);
  }
}

generateTutorialPDF();
