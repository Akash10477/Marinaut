import QRCode from 'qrcode'
import { BRAND, TAGLINE } from '../brand'

// jsPDF is large, so it is loaded only when a PDF is downloaded (lazy import)
const loadJsPDF = async () => (await import('jspdf')).jsPDF

// jsPDF's default font has no "৳" glyph, so PDFs use "BDT"
const bdt = (n) => `BDT ${Number(n || 0).toLocaleString('en-IN')}`
const when = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
const day = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-')

// Receipt verify link encoded in the QR. After deploy it uses the live domain automatically.
export const verifyUrl = (txn) => `${window.location.origin}/verify/${txn}`
export const lookupUrl = (reg) => `${window.location.origin}/?reg=${encodeURIComponent(reg)}`

export const qrDataUrl = (text) => QRCode.toDataURL(text, { margin: 1, width: 320, errorCorrectionLevel: 'M' })

const NAVY = [11, 47, 71]
const GRAY = [100, 116, 139]
const DARK = [15, 23, 42]

// Logo (favicon.svg) -> PNG for the PDF. Returns null on failure (PDF is made without a logo)
const logoPng = async () => {
  try {
    const svg = await (await fetch('/favicon.svg')).text()
    const img = new Image()
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 192
    canvas.getContext('2d').drawImage(img, 0, 0, 192, 192)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

// Navy header band at the top + logo
async function header(doc, subtitle) {
  const w = doc.internal.pageSize.getWidth()
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, w, 30, 'F')
  const logo = await logoPng()
  const x = logo ? 36 : 15
  if (logo) doc.addImage(logo, 'PNG', 14, 5, 19, 19)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(BRAND, x, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(subtitle, x, 22)
  doc.setFontSize(8)
  doc.setTextColor(186, 230, 253)
  doc.text(TAGLINE, w - 15, 14, { align: 'right' })
}

// label : value rows; returns the next y position
function rows(doc, items, x, y, valueX, maxWidth) {
  doc.setFontSize(10)
  items.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(label, x, y)
    doc.setTextColor(...DARK)
    const lines = doc.splitTextToSize(String(value ?? '-'), maxWidth)
    doc.text(lines, valueX, y)
    y += 7 * lines.length
  })
  return y
}

function footer(doc, text) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  doc.setDrawColor(226, 232, 240)
  doc.line(15, h - 18, w - 15, h - 18)
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text(text, w / 2, h - 11, { align: 'center' })
}

// ---------------- Payment receipt ----------------
// payment = GET /api/payments/:id -> payment (fine, vessel, issuedBy, paidBy populated)
export async function downloadReceiptPdf(payment) {
  const f = payment.fine
  const jsPDF = await loadJsPDF()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const w = doc.internal.pageSize.getWidth()
  await header(doc, 'Official Payment Receipt')

  // PAID stamp
  doc.setDrawColor(5, 150, 105)
  doc.setTextColor(5, 150, 105)
  doc.setLineWidth(0.8)
  doc.roundedRect(w - 45, 40, 30, 12, 2, 2)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('PAID', w - 30, 48.5, { align: 'center' })

  doc.setTextColor(...DARK)
  doc.setFontSize(12)
  doc.text(`Receipt / Transaction ID: ${payment.transactionId}`, 15, 47)

  let y = rows(
    doc,
    [
      ['Paid on', when(payment.paidAt)],
      ['Payment method', payment.method],
      ['Paid by', payment.paidBy?.name],
      ['Fine number', f.fineNumber],
      ['Vessel', `${f.vessel?.vesselName} (${f.vessel?.registrationNumber})`],
      ['Vessel type', f.vessel?.vesselType],
      ['Violation', f.violationTitle],
      ['Location', f.location],
      ['Issued', `${day(f.issuedAt)} by ${f.issuedBy?.name || '-'}${f.issuedBy?.badgeNumber ? ` (${f.issuedBy.badgeNumber})` : ''}`],
    ],
    15,
    62,
    60,
    80,
  )

  // Amount box
  y += 4
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(15, y, 125, 34, 2, 2, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text('Fine amount', 20, y + 9)
  doc.text('Late fee', 20, y + 16)
  doc.setTextColor(...DARK)
  doc.text(bdt(payment.fineAmount), 135, y + 9, { align: 'right' })
  doc.text(bdt(payment.lateFee), 135, y + 16, { align: 'right' })
  doc.setDrawColor(203, 213, 225)
  doc.line(20, y + 20, 135, y + 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('Total paid', 20, y + 28)
  doc.text(bdt(payment.totalAmount), 135, y + 28, { align: 'right' })

  // QR code (right side)
  const url = verifyUrl(payment.transactionId)
  doc.addImage(await qrDataUrl(url), 'PNG', w - 60, 62, 45, 45)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...DARK)
  doc.text('Scan to verify', w - 37.5, 112, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text(doc.splitTextToSize(url, 50), w - 37.5, 117, { align: 'center' })

  footer(doc, 'System-generated receipt. Scan the QR code or visit the link to confirm it is genuine.')
  doc.save(`receipt-${payment.transactionId}.pdf`)
}

// ---------------- Fine notice (given to the owner) ----------------
// fine = GET /api/fines/:id -> fine (vessel, violation, issuedBy populated + lateFeeInfo)
export async function downloadFineNoticePdf(fine) {
  const jsPDF = await loadJsPDF()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const w = doc.internal.pageSize.getWidth()
  await header(doc, 'Fine Notice')

  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`Fine number: ${fine.fineNumber}`, 15, 47)

  const status = fine.status === 'Unpaid' && fine.lateFeeInfo?.periods ? 'Overdue' : fine.status
  let y = rows(
    doc,
    [
      ['Status', status],
      ['Vessel', `${fine.vessel?.vesselName} (${fine.vessel?.registrationNumber})`],
      ['Violation', `${fine.violationCode} - ${fine.violationTitle}${fine.isRepeatOffence ? ' (repeat offence, 2x)' : ''}`],
      ['Location', fine.location],
      ['Issued', `${when(fine.issuedAt)} by ${fine.issuedBy?.name || '-'}${fine.issuedBy?.badgeNumber ? ` (${fine.issuedBy.badgeNumber})` : ''}`],
      ['Pay by (due date)', day(fine.dueDate)],
      ['Notes', fine.notes || '-'],
    ],
    15,
    62,
    60,
    80,
  )

  y += 4
  doc.setFillColor(254, 242, 242)
  doc.roundedRect(15, y, 125, 27, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...DARK)
  doc.text(fine.status === 'Unpaid' ? 'Amount payable now' : 'Fine amount', 20, y + 10)
  doc.text(bdt(fine.status === 'Unpaid' ? fine.totalPayable : fine.amount), 135, y + 10, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY)
  const rate = fine.isRepeatOffence ? 10 : 5
  doc.text(doc.splitTextToSize(`If not paid by the due date, the fine increases by ${rate}% of the base amount every 30 days.`, 115), 20, y + 18)

  const url = lookupUrl(fine.vessel?.registrationNumber)
  doc.addImage(await qrDataUrl(url), 'PNG', w - 60, 62, 45, 45)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...DARK)
  doc.text('Scan to check & pay', w - 37.5, 112, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text(doc.splitTextToSize(url, 50), w - 37.5, 117, { align: 'center' })

  footer(doc, 'Vessel owners can log in to the Vessel Owner portal to pay this fine online.')
  doc.save(`fine-notice-${fine.fineNumber}.pdf`)
}
