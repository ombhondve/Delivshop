import PDFDocument from 'pdfkit';
import { PickupRecord, SupplierBill } from '../types/supplier-billing.types.js';
import { Company } from '../types/company.types.js';

export const pdfGeneratorService = {
  /**
   * PDF 1 — Supplier Pickup Summary
   * QUANTITY-ONLY physical pickup verification document.
   * STRICT INVARIANT: MUST NOT disclose supplier prices, line amounts, taxes, bill totals, or payment data.
   */
  async generatePickupSummaryPdf(pickup: PickupRecord, company: Partial<Company>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        info: {
          Title: `Supplier Pickup Summary - ${pickup.pickupReference}`,
          Author: 'Delivshop Logistics & Supply Chain',
          Subject: 'Physical Goods Pickup & Verification Summary',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#065F46'; // Forest Green
      const darkColor = '#0F172A';
      const grayColor = '#475569';
      const lightBorder = '#CBD5E1';

      // --- DOCUMENT HEADER ---
      doc.rect(36, 36, 523, 50).fill('#F0FDF4');
      doc.rect(36, 36, 523, 50).stroke('#BBF7D0');

      doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold')
        .text('DELIVSHOP LOGISTICS FACILITY', 48, 46);
      doc.fillColor(grayColor).fontSize(9).font('Helvetica')
        .text('Central Distribution Hub • Supplier Inward Goods Intake • Quantity Verification', 48, 66);

      doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold')
        .text('SUPPLIER PICKUP SUMMARY', 340, 46, { align: 'right', width: 205 });
      doc.fillColor(darkColor).fontSize(8).font('Helvetica-Bold')
        .text(`REF: ${pickup.pickupReference}`, 340, 64, { align: 'right', width: 205 });
      doc.fillColor(grayColor).fontSize(8).font('Helvetica')
        .text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 340, 75, { align: 'right', width: 205 });

      let y = 98;

      // --- NOTICE BANNER ---
      doc.rect(36, y, 523, 20).fill('#EFF6FF');
      doc.rect(36, y, 523, 20).stroke('#BFDBFE');
      doc.fillColor('#1E40AF').fontSize(8).font('Helvetica-Bold')
        .text('VERIFICATION NOTICE: QUANTITY RECORD ONLY — STRICTLY ZERO FINANCIAL PRICING DATA', 46, y + 6);
      y += 28;

      // --- 2-COLUMN DETAILS (SUPPLIER & PICKUP DETAILS) ---
      const colWidth = 256;

      // Left Column: Supplier Details
      doc.rect(36, y, colWidth, 90).fill('#F8FAFC').stroke(lightBorder);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text('SUPPLIER COMPANY DETAILS', 46, y + 8);
      doc.fillColor(darkColor).fontSize(9).font('Helvetica-Bold').text(pickup.companyName, 46, y + 22);
      doc.fillColor(grayColor).fontSize(8).font('Helvetica')
        .text(`Company Code: ${pickup.companyCode}`, 46, y + 36)
        .text(`Contact: ${company.contactPerson || 'Facility Dispatch Manager'}`, 46, y + 48)
        .text(`Phone: ${company.phone || '—'}  |  Email: ${company.email || '—'}`, 46, y + 60)
        .text(`Pickup Address: ${company.addressLine1 || 'Main Facility Loading Gate'}`, 46, y + 72, { width: colWidth - 20 });

      // Right Column: Pickup Operational Details
      const rightX = 36 + colWidth + 11;
      doc.rect(rightX, y, colWidth, 90).fill('#F8FAFC').stroke(lightBorder);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text('PICKUP & ROUTE DETAILS', rightX + 10, y + 8);
      doc.fillColor(grayColor).fontSize(8).font('Helvetica')
        .text(`Pickup Status: `, rightX + 10, y + 22, { continued: true })
        .font('Helvetica-Bold').fillColor(pickup.status === 'VERIFIED' ? '#059669' : '#D97706').text(pickup.status)
        .font('Helvetica').fillColor(grayColor)
        .text(`Scheduled Date: ${pickup.scheduledDate || 'Awaiting Scheduling'} (${pickup.scheduledTimeWindow || 'Morning Run'})`, rightX + 10, y + 34)
        .text(`Delivery Run: ${pickup.runCode || 'Direct Route Assignment'}  •  Route: ${pickup.routeName || 'Standard Route'}`, rightX + 10, y + 46)
        .text(`Assigned Driver: ${pickup.driverName || 'Designated Route Driver'} (${pickup.driverPhone || '—'})`, rightX + 10, y + 58)
        .text(`Vehicle Reg: ${pickup.vehicleRegistration || 'Commercial Fleet'}`, rightX + 10, y + 70)
        .text(`Verified At: ${pickup.verifiedAt ? new Date(pickup.verifiedAt).toLocaleString('en-IN') : 'Pending Physical Verification'}`, rightX + 10, y + 82);

      y += 100;

      // --- PRODUCT-WISE QUANTITY TABLE ---
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('PRODUCT-WISE QUANTITY VERIFICATION TABLE', 36, y);
      y += 14;

      // Table Header
      doc.rect(36, y, 523, 20).fill('#1E293B');
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
      doc.text('PRODUCT / SKU', 42, y + 6, { width: 140 });
      doc.text('CATEGORY', 184, y + 6, { width: 60 });
      doc.text('UNIT', 246, y + 6, { width: 45 });
      doc.text('REQ', 293, y + 6, { width: 45, align: 'right' });
      doc.text('COLLECT', 340, y + 6, { width: 50, align: 'right' });
      doc.text('ACCEPTED', 392, y + 6, { width: 50, align: 'right' });
      doc.text('REJECTED', 444, y + 6, { width: 48, align: 'right' });
      doc.text('SHORTAGE', 494, y + 6, { width: 58, align: 'right' });
      y += 20;

      // Table Rows
      const unitMap = new Map<string, { req: number; col: number; acc: number; rej: number; sho: number }>();

      pickup.items.forEach((item, index) => {
        // Page break if near bottom
        if (y > 700) {
          doc.addPage();
          y = 36;
        }

        const isEven = index % 2 === 0;
        doc.rect(36, y, 523, 22).fill(isEven ? '#FFFFFF' : '#F8FAFC').stroke('#E2E8F0');

        doc.fillColor(darkColor).fontSize(8).font('Helvetica-Bold')
          .text(item.productName, 42, y + 4, { width: 138, height: 10, ellipsis: true });
        doc.fillColor(grayColor).fontSize(7).font('Helvetica')
          .text(`SKU: ${item.productSku}`, 42, y + 13, { width: 138 });

        doc.fillColor(grayColor).fontSize(7.5).font('Helvetica').text(item.category || 'Dairy', 184, y + 7, { width: 60 });
        doc.text(item.unit, 246, y + 7, { width: 45 });

        // Quantities
        doc.fillColor(darkColor).fontSize(8).font('Helvetica').text(String(item.requiredQuantity), 293, y + 7, { width: 45, align: 'right' });
        doc.text(String(item.collectedQuantity), 340, y + 7, { width: 50, align: 'right' });
        
        doc.font('Helvetica-Bold').fillColor('#047857')
          .text(String(item.acceptedQuantity), 392, y + 7, { width: 50, align: 'right' });
        
        doc.font('Helvetica').fillColor(item.rejectedQuantity > 0 ? '#DC2626' : grayColor)
          .text(String(item.rejectedQuantity), 444, y + 7, { width: 48, align: 'right' });

        doc.fillColor(item.shortageQuantity > 0 ? '#D97706' : grayColor)
          .text(String(item.shortageQuantity), 494, y + 7, { width: 58, align: 'right' });

        // Aggregate compatible units
        const u = item.unit || 'Unit';
        if (!unitMap.has(u)) {
          unitMap.set(u, { req: 0, col: 0, acc: 0, rej: 0, sho: 0 });
        }
        const uStats = unitMap.get(u)!;
        uStats.req += item.requiredQuantity;
        uStats.col += item.collectedQuantity;
        uStats.acc += item.acceptedQuantity;
        uStats.rej += item.rejectedQuantity;
        uStats.sho += item.shortageQuantity;

        y += 22;
      });

      // --- UNIT-WISE COMPATIBLE TOTALS SUMMARY ---
      y += 10;
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text('COMPATIBLE UNIT-WISE TOTALS (No Incompatible Unit Mixing)', 36, y);
      y += 12;

      for (const [unit, totals] of unitMap.entries()) {
        doc.rect(36, y, 523, 18).fill('#F1F5F9').stroke('#CBD5E1');
        doc.fillColor(darkColor).fontSize(8).font('Helvetica-Bold').text(`Total (${unit}):`, 42, y + 5);
        doc.text(`Required: ${totals.req} ${unit}`, 184, y + 5);
        doc.text(`Collected: ${totals.col} ${unit}`, 280, y + 5);
        doc.fillColor('#059669').text(`Accepted: ${totals.acc} ${unit}`, 370, y + 5);
        doc.fillColor(totals.rej > 0 ? '#DC2626' : grayColor).text(`Rejected: ${totals.rej} ${unit}`, 460, y + 5);
        y += 20;
      }

      // --- DISCREPANCY & REMARKS SECTION ---
      y += 10;
      if (pickup.discrepancyReason || pickup.verificationNotes || pickup.notes) {
        doc.rect(36, y, 523, 36).fill('#FFFBEB').stroke('#FDE68A');
        doc.fillColor('#92400E').fontSize(8).font('Helvetica-Bold').text('DISCREPANCY & VERIFICATION REMARKS:', 44, y + 6);
        const remarksText = [
          pickup.discrepancyReason ? `Driver Discrepancy: ${pickup.discrepancyReason}` : null,
          pickup.verificationNotes ? `Staff Verification Notes: ${pickup.verificationNotes}` : null,
          pickup.notes ? `General Notes: ${pickup.notes}` : null,
        ].filter(Boolean).join('  |  ');
        doc.fillColor('#78350F').fontSize(8).font('Helvetica').text(remarksText || 'None recorded.', 44, y + 18, { width: 505 });
        y += 44;
      }

      // --- SIGNATURE / VERIFICATION BLOCK ---
      if (y > 680) {
        doc.addPage();
        y = 50;
      } else {
        y = Math.max(y + 20, 680);
      }

      const sigWidth = 160;
      doc.rect(36, y, sigWidth, 60).stroke(lightBorder);
      doc.fillColor(grayColor).fontSize(7).font('Helvetica-Bold').text('DRIVER / COLLECTOR SIGNATURE', 44, y + 6);
      doc.fontSize(7).font('Helvetica').text(`Name: ${pickup.driverName || '—'}`, 44, y + 36);
      doc.text(`Date & Time: ${pickup.completedTime ? new Date(pickup.completedTime).toLocaleString('en-IN') : '—'}`, 44, y + 46);

      doc.rect(216, y, sigWidth, 60).stroke(lightBorder);
      doc.fillColor(grayColor).fontSize(7).font('Helvetica-Bold').text('DELIVSHOP VERIFIED BY', 224, y + 6);
      doc.fontSize(7).font('Helvetica').text(`Staff: ${pickup.verifiedByName || 'Authorized Inspector'}`, 224, y + 36);
      doc.text(`Date & Time: ${pickup.verifiedAt ? new Date(pickup.verifiedAt).toLocaleString('en-IN') : '—'}`, 224, y + 46);

      doc.rect(396, y, 163, 60).stroke(lightBorder);
      doc.fillColor(grayColor).fontSize(7).font('Helvetica-Bold').text('SUPPLIER FACILITY SIGNATURE', 404, y + 6);
      doc.fontSize(7).font('Helvetica').text(`Representative: ${company.contactPerson || 'Authorized Officer'}`, 404, y + 36);
      doc.text('Date & Stamp: ___________________', 404, y + 46);

      doc.end();
    });
  },

  /**
   * PDF 2 — Detailed Supplier Payment Bill
   * Comprehensive financial statement in INR (₹) linking verified pickups, accepted quantities,
   * agreed supplier unit prices, taxes, approved adjustments, payment history, and outstanding balance.
   */
  async generateSupplierBillPdf(bill: SupplierBill, company: Partial<Company>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        info: {
          Title: `Supplier Payment Bill - ${bill.billNumber}`,
          Author: 'Delivshop Accounts Payable & Finance',
          Subject: 'Supplier Settlement Bill and Payment Statement',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#065F46'; // Forest Green
      const darkColor = '#0F172A';
      const grayColor = '#475569';
      const lightBorder = '#CBD5E1';

      // --- DOCUMENT HEADER ---
      doc.rect(36, 36, 523, 56).fill('#F0FDF4');
      doc.rect(36, 36, 523, 56).stroke('#BBF7D0');

      doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold')
        .text('DELIVSHOP LOGISTICS & SETTLEMENTS', 48, 44);
      doc.fillColor(grayColor).fontSize(8.5).font('Helvetica')
        .text('Central Distribution Facilities • Accounts Payable Department • Pune / Nashik', 48, 63);
      doc.text('GSTIN: 27AABCD1234F1Z5  •  Email: accounts@delivshop.com  •  Phone: +91 20 2567 8900', 48, 74);

      doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold')
        .text('SUPPLIER PAYMENT BILL', 340, 44, { align: 'right', width: 205 });
      doc.fillColor(darkColor).fontSize(9).font('Helvetica-Bold')
        .text(`BILL NO: ${bill.billNumber}`, 340, 60, { align: 'right', width: 205 });
      doc.fillColor(grayColor).fontSize(8).font('Helvetica')
        .text(`Date: ${bill.billDate}  •  Due: ${bill.dueDate}`, 340, 74, { align: 'right', width: 205 });

      let y = 104;

      // --- BILL STATUS & HIGHLIGHTS BAR ---
      doc.rect(36, y, 523, 24).fill('#F8FAFC').stroke(lightBorder);
      doc.fillColor(darkColor).fontSize(8).font('Helvetica')
        .text(`Status: `, 46, y + 7, { continued: true })
        .font('Helvetica-Bold').fillColor(bill.status === 'FINALIZED' ? '#047857' : '#D97706').text(bill.status, { continued: true })
        .font('Helvetica').fillColor(darkColor).text(`  |  Payment Status: `, { continued: true })
        .font('Helvetica-Bold')
        .fillColor(bill.paymentStatus === 'PAID' ? '#059669' : bill.paymentStatus === 'PARTIALLY_PAID' ? '#D97706' : '#DC2626')
        .text(bill.paymentStatus, { continued: true })
        .font('Helvetica').fillColor(darkColor).text(`  |  Billing Period: `, { continued: true })
        .font('Helvetica-Bold').text(`${bill.billingPeriodStart} to ${bill.billingPeriodEnd}`, { continued: true })
        .font('Helvetica').fillColor(darkColor).text(`  |  Payment Terms: `, { continued: true })
        .font('Helvetica-Bold').text(company.paymentTerms || 'NET_15');

      y += 32;

      // --- 2-COLUMN SECTION: SUPPLIER DETAILS & AUDIT REFERENCE ---
      const colWidth = 256;
      doc.rect(36, y, colWidth, 90).fill('#FFFFFF').stroke(lightBorder);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text('BILLED TO (SUPPLIER COMPANY)', 46, y + 8);
      doc.fillColor(darkColor).fontSize(9).font('Helvetica-Bold').text(bill.companyName, 46, y + 22);
      doc.fillColor(grayColor).fontSize(8).font('Helvetica')
        .text(`Supplier ID: ${bill.companyCode}`, 46, y + 36)
        .text(`GSTIN: ${bill.companyGstin || 'Not Registered / Excluded'}`, 46, y + 48)
        .text(`Contact: ${bill.companyContactPerson || 'Supplier Representative'} (${bill.companyPhone || '—'})`, 46, y + 60)
        .text(`Address: ${bill.companyAddress || 'Registered Facility Address'}`, 46, y + 72, { width: colWidth - 20 });

      const rightX = 36 + colWidth + 11;
      doc.rect(rightX, y, colWidth, 90).fill('#FFFFFF').stroke(lightBorder);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text('LINKED UNDERLYING PICKUPS & RUNS', rightX + 10, y + 8);
      doc.fillColor(grayColor).fontSize(8).font('Helvetica')
        .text(`Underlying Pickup References:`, rightX + 10, y + 22)
        .font('Helvetica-Bold').fillColor(darkColor)
        .text(bill.pickupReferences.length > 0 ? bill.pickupReferences.join(', ') : 'Direct Facility Intakes', rightX + 10, y + 34, { width: colWidth - 20 })
        .font('Helvetica').fillColor(grayColor)
        .text(`Created By: ${bill.createdByName || 'Finance Admin'}`, rightX + 10, y + 54)
        .text(`Verified At: ${bill.verifiedAt ? new Date(bill.verifiedAt).toLocaleString('en-IN') : 'Standard Inward Verification'}`, rightX + 10, y + 66)
        .text(`Approved By: ${bill.approvedByName || bill.createdByName || 'System Controller'}`, rightX + 10, y + 78);

      y += 100;

      // --- PRODUCT-WISE FINANCIAL BREAKDOWN TABLE ---
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('PRODUCT-WISE FINANCIAL & QUANTITY BREAKDOWN', 36, y);
      y += 14;

      // Table Header
      doc.rect(36, y, 523, 22).fill('#1E293B');
      doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold');
      doc.text('PRODUCT / SKU', 40, y + 7, { width: 120 });
      doc.text('UNIT', 162, y + 7, { width: 35 });
      doc.text('REQ', 198, y + 7, { width: 30, align: 'right' });
      doc.text('COL', 230, y + 7, { width: 30, align: 'right' });
      doc.text('ACCEPTED*', 262, y + 7, { width: 44, align: 'right' });
      doc.text('REJ', 308, y + 7, { width: 24, align: 'right' });
      doc.text('UNIT PRICE (INR)', 334, y + 7, { width: 62, align: 'right' });
      doc.text('TAX %', 398, y + 7, { width: 32, align: 'right' });
      doc.text('TAX (INR)', 432, y + 7, { width: 42, align: 'right' });
      doc.text('TOTAL (INR)', 476, y + 7, { width: 78, align: 'right' });
      y += 22;

      // Rows
      bill.items.forEach((item, index) => {
        if (y > 670) {
          doc.addPage();
          y = 36;
        }

        const isEven = index % 2 === 0;
        doc.rect(36, y, 523, 22).fill(isEven ? '#FFFFFF' : '#F8FAFC').stroke('#E2E8F0');

        doc.fillColor(darkColor).fontSize(7.5).font('Helvetica-Bold')
          .text(item.productName, 40, y + 4, { width: 118, height: 9, ellipsis: true });
        doc.fillColor(grayColor).fontSize(6.5).font('Helvetica')
          .text(`SKU: ${item.productSku}  •  ${item.pickupReference || ''}`, 40, y + 13, { width: 118 });

        doc.fillColor(grayColor).fontSize(7).font('Helvetica').text(item.unit, 162, y + 7, { width: 35 });
        doc.text(String(item.requiredQuantity), 198, y + 7, { width: 30, align: 'right' });
        doc.text(String(item.collectedQuantity), 230, y + 7, { width: 30, align: 'right' });

        // Accepted (Billable) Quantity
        doc.font('Helvetica-Bold').fillColor('#047857')
          .text(String(item.acceptedQuantity), 262, y + 7, { width: 44, align: 'right' });

        doc.font('Helvetica').fillColor(item.rejectedQuantity > 0 ? '#DC2626' : grayColor)
          .text(String(item.rejectedQuantity), 308, y + 7, { width: 24, align: 'right' });

        doc.fillColor(darkColor)
          .text(`₹${item.unitPrice.toFixed(2)}`, 334, y + 7, { width: 62, align: 'right' });

        doc.text(`${item.taxRate.toFixed(1)}%`, 398, y + 7, { width: 32, align: 'right' });
        doc.text(`₹${item.taxAmount.toFixed(2)}`, 432, y + 7, { width: 42, align: 'right' });

        doc.font('Helvetica-Bold').fillColor(darkColor)
          .text(`₹${item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 476, y + 7, { width: 78, align: 'right' });

        y += 22;
      });

      doc.fillColor(grayColor).fontSize(7).font('Helvetica-Oblique')
        .text('* Payable amounts are calculated strictly on Accepted (Billable) Quantities × Agreed Supplier Unit Price.', 36, y + 4);
      y += 18;

      // --- FINANCIAL SUMMARY BOX ---
      if (y > 620) {
        doc.addPage();
        y = 36;
      }

      const summaryY = y;
      doc.rect(36, summaryY, 260, 110).fill('#F8FAFC').stroke(lightBorder);
      doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold').text('PAYMENT RECORDING & BANK DETAILS', 46, summaryY + 8);
      doc.fillColor(grayColor).fontSize(8).font('Helvetica')
        .text(`Bank Name: ${company.bankName || 'State Bank of India'}`, 46, summaryY + 24)
        .text(`Account No: ${company.bankAccountNumber || '•••• •••• •••• 4092'}`, 46, summaryY + 36)
        .text(`IFSC Code: ${company.bankIfsc || 'SBIN0001234'}`, 46, summaryY + 48)
        .text(`Settlement Cycle: ${company.paymentTerms || 'NET_15'} Days`, 46, summaryY + 60)
        .text(`Currency: Indian Rupee (INR / ₹)`, 46, summaryY + 72);

      // Financial Totals on Right
      const rightSumX = 308;
      doc.rect(rightSumX, summaryY, 251, 110).fill('#FFFFFF').stroke(lightBorder);

      const renderTotalRow = (label: string, value: string, rowY: number, isBold = false, color = darkColor) => {
        doc.fillColor(isBold ? darkColor : grayColor).fontSize(8).font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .text(label, rightSumX + 12, rowY);
        doc.fillColor(color).fontSize(8.5).font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .text(value, rightSumX + 130, rowY, { align: 'right', width: 105 });
      };

      renderTotalRow('Product Subtotal:', `₹${bill.subtotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryY + 8);
      renderTotalRow('Applicable Taxes (GST):', `₹${bill.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryY + 22);
      renderTotalRow('Approved Adjustments:', `₹${bill.adjustmentsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryY + 36);

      doc.rect(rightSumX + 8, summaryY + 50, 235, 1).fill('#CBD5E1');

      renderTotalRow('FINAL BILL TOTAL:', `₹${bill.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryY + 54, true, primaryColor);
      renderTotalRow('Amount Paid to Date:', `₹${bill.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryY + 70, false, '#059669');

      doc.rect(rightSumX + 8, summaryY + 84, 235, 22).fill('#FEF2F2').stroke('#FCA5A5');
      doc.fillColor('#991B1B').fontSize(9).font('Helvetica-Bold')
        .text('OUTSTANDING BALANCE:', rightSumX + 14, summaryY + 91);
      doc.fillColor('#DC2626').fontSize(10).font('Helvetica-Bold')
        .text(`₹${bill.outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightSumX + 120, summaryY + 90, { align: 'right', width: 115 });

      y += 120;

      // --- PAYMENT HISTORY SECTION ---
      if (bill.payments && bill.payments.length > 0) {
        if (y > 660) {
          doc.addPage();
          y = 36;
        }

        doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text('RECORDED PAYMENT TRANSACTIONS', 36, y);
        y += 12;

        doc.rect(36, y, 523, 18).fill('#1E293B');
        doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold');
        doc.text('PAYMENT REF', 44, y + 5);
        doc.text('DATE', 150, y + 5);
        doc.text('METHOD', 230, y + 5);
        doc.text('TRANSACTION REF', 310, y + 5);
        doc.text('STATUS', 410, y + 5);
        doc.text('AMOUNT (INR)', 470, y + 5, { align: 'right', width: 80 });
        y += 18;

        bill.payments.forEach((pay) => {
          doc.rect(36, y, 523, 18).fill('#F8FAFC').stroke('#E2E8F0');
          doc.fillColor(darkColor).fontSize(7.5).font('Helvetica-Bold').text(pay.paymentNumber, 44, y + 5);
          doc.fillColor(grayColor).font('Helvetica').text(new Date(pay.paymentDate).toLocaleDateString('en-IN'), 150, y + 5);
          doc.text(pay.paymentMethod, 230, y + 5);
          doc.text(pay.transactionReference || 'Internal Ledger', 310, y + 5);
          doc.fillColor('#059669').text(pay.status, 410, y + 5);
          doc.fillColor(darkColor).font('Helvetica-Bold').text(`₹${pay.amount.toFixed(2)}`, 470, y + 5, { align: 'right', width: 80 });
          y += 18;
        });

        y += 10;
      }

      // --- AUDIT FOOTER & RECONCILIATION STATEMENT ---
      if (y > 700) {
        doc.addPage();
        y = 36;
      }

      doc.rect(36, y, 523, 40).fill('#F8FAFC').stroke(lightBorder);
      doc.fillColor(grayColor).fontSize(7).font('Helvetica')
        .text('AUDIT & RECONCILIATION STATEMENT:', 44, y + 6)
        .text('This bill is authoritatively generated by the Delivshop Facility Accounts System based on verified delivery-run pickup records and accepted product quantities. All calculations use decimal-safe arithmetic. Discrepancies must be raised within 7 business days.', 44, y + 16, { width: 505 });

      doc.end();
    });
  },
};
