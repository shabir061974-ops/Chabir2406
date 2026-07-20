import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { formatKD } from "@/lib/format";

const FOREST = [22, 78, 46]; // #164E2E, matches the site's brand color
const MARGIN = { top: 14, bottom: 16, left: 10, right: 10 };

async function loadImageAsDataUrl(url) {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch {
        return null; // logo is a nice-to-have; never fail the whole report over it
    }
}

function pageWidth(doc) { return doc.internal.pageSize.getWidth(); }
function pageHeight(doc) { return doc.internal.pageSize.getHeight(); }
function contentWidth(doc) { return pageWidth(doc) - MARGIN.left - MARGIN.right; }

function ensureSpace(doc, y, needed) {
    if (y + needed > pageHeight(doc) - MARGIN.bottom) {
        doc.addPage();
        return MARGIN.top;
    }
    return y;
}

function sectionTitle(doc, y, text) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...FOREST);
    doc.text(text, MARGIN.left, y);
    doc.setTextColor(20, 20, 20);
    return y + 6;
}

/** Rasterizes a DOM node (a chart container) into the PDF as a crisp image. */
async function addChartImage(doc, node, y, title) {
    if (!node) return y;
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const ratio = canvas.height / canvas.width;
    const w = contentWidth(doc);
    const h = w * ratio;
    y = ensureSpace(doc, y, 8 + h);
    y = sectionTitle(doc, y, title);
    doc.addImage(imgData, "PNG", MARGIN.left, y, w, h);
    return y + h + 8;
}

function addHeader(doc, { logoDataUrl, dateFrom, dateTo }) {
    let y = MARGIN.top;
    if (logoDataUrl) {
        try { doc.addImage(logoDataUrl, "PNG", MARGIN.left, y - 6, 16, 16); } catch { /* ignore malformed image */ }
    }
    const textX = logoDataUrl ? MARGIN.left + 20 : MARGIN.left;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...FOREST);
    doc.text("AL-FAIHA CO-OPERATIVE SOCIETY", textX, y - 2);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 90);
    doc.text("Faiha Store", textX, y + 3);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text("Sales Report", pageWidth(doc) - MARGIN.right, y - 2, { align: "right" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 90);
    const now = new Date();
    doc.text(`Generated: ${now.toLocaleString()}`, pageWidth(doc) - MARGIN.right, y + 3, { align: "right" });
    doc.text(`Period: ${dateFrom} to ${dateTo}`, pageWidth(doc) - MARGIN.right, y + 8, { align: "right" });

    doc.setDrawColor(220, 220, 220);
    doc.line(MARGIN.left, y + 12, pageWidth(doc) - MARGIN.right, y + 12);
    return y + 18;
}

function addSummaryCards(doc, y, summary, currency) {
    y = sectionTitle(doc, y, "Sales Summary");
    const cards = [
        ["Total Orders", String(summary.total_orders)],
        ["Completed Orders", String(summary.completed_orders)],
        ["Cancelled Orders", String(summary.cancelled_orders)],
        ["Pending Orders", String(summary.pending_orders)],
        ["Total Revenue", formatKD(summary.total_revenue, currency)],
        ["Average Order Value", formatKD(summary.avg_order_value, currency)],
        ["Total Products Sold", String(summary.total_products_sold)],
        ["Total Customers", String(summary.total_customers)],
    ];
    const cols = 4;
    const cw = contentWidth(doc) / cols;
    const rowH = 16;
    cards.forEach(([label, value], i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = MARGIN.left + col * cw;
        const cy = y + row * rowH;
        doc.setDrawColor(230, 230, 230);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(x, cy, cw - 3, rowH - 3, 1.5, 1.5, "FD");
        doc.setFontSize(7.5);
        doc.setTextColor(120, 120, 120);
        doc.text(label, x + 3, cy + 5);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(20, 20, 20);
        doc.text(value, x + 3, cy + 11);
        doc.setFont("helvetica", "normal");
    });
    const rows = Math.ceil(cards.length / cols);
    return y + rows * rowH + 6;
}

function addTopProductsTable(doc, y, topProducts, currency) {
    if (!topProducts.length) return y;
    y = ensureSpace(doc, y, 20);
    y = sectionTitle(doc, y, "Top 10 Selling Products");
    autoTable(doc, {
        startY: y,
        margin: { left: MARGIN.left, right: MARGIN.right },
        head: [["Product Name", "Quantity Sold", "Sales Amount"]],
        body: topProducts.map((p) => [p.name, String(p.qty), formatKD(p.amount, currency)]),
        theme: "grid",
        headStyles: { fillColor: FOREST, textColor: 255, fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 2 },
    });
    return doc.lastAutoTable.finalY + 8;
}

function addPaymentSummaryTable(doc, y, paymentSummary, currency) {
    if (!paymentSummary.length) return y;
    y = ensureSpace(doc, y, 20);
    y = sectionTitle(doc, y, "Payment Summary");
    autoTable(doc, {
        startY: y,
        margin: { left: MARGIN.left, right: MARGIN.right },
        head: [["Payment Method", "Orders", "Amount"]],
        body: paymentSummary.map((p) => [p.method, String(p.count), formatKD(p.amount, currency)]),
        theme: "grid",
        headStyles: { fillColor: FOREST, textColor: 255, fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 2 },
    });
    return doc.lastAutoTable.finalY + 8;
}

function addSalesDetailsTable(doc, y, salesDetails, currency) {
    y = ensureSpace(doc, y, 20);
    y = sectionTitle(doc, y, "Sales Details");
    autoTable(doc, {
        startY: y,
        margin: { left: MARGIN.left, right: MARGIN.right },
        head: [["Order #", "Date", "Customer", "Phone", "Payment", "Status", "Products", "Qty", "Subtotal", "Delivery", "Discount", "Grand Total"]],
        body: salesDetails.map((o) => [
            o.order_no,
            o.placed_at ? new Date(o.placed_at).toLocaleString() : "",
            o.customer_name || "",
            o.customer_phone || "",
            o.payment_method || "",
            o.order_status || "",
            o.products || "",
            String(o.qty),
            Number(o.subtotal || 0).toFixed(3),
            Number(o.delivery_charge || 0).toFixed(3),
            Number(o.discount_amount || 0).toFixed(3),
            formatKD(o.net_payable || 0, currency),
        ]),
        theme: "grid",
        headStyles: { fillColor: FOREST, textColor: 255, fontSize: 7.5 },
        styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
        columnStyles: { 6: { cellWidth: 45 } }, // Products column needs more room
    });
    return doc.lastAutoTable.finalY + 6;
}

function addFootersAndPageNumbers(doc) {
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        const h = pageHeight(doc);
        const w = pageWidth(doc);
        doc.setDrawColor(230, 230, 230);
        doc.line(MARGIN.left, h - 10, w - MARGIN.right, h - 10);
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        doc.text("Faiha Store — AL-FAIHA CO-OPERATIVE SOCIETY", MARGIN.left, h - 5);
        doc.text(`Page ${i} of ${pages}`, w - MARGIN.right, h - 5, { align: "right" });
    }
}

/**
 * Builds and downloads the Sales Report PDF. `report` is the /admin/reports/sales response.
 * `chartNodes` is a { key: HTMLElement } map of the already-rendered chart containers to
 * rasterize into the PDF (so the PDF's charts are pixel-identical to what's on screen).
 */
export async function generateSalesReportPdf(report, chartNodes = {}) {
    if (!report || !report.summary || report.summary.total_orders === 0) {
        throw new Error("No sales found for the selected period.");
    }
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const logoDataUrl = await loadImageAsDataUrl("/faiha-logo.png");

    let y = addHeader(doc, { logoDataUrl, dateFrom: report.date_from, dateTo: report.date_to });
    y = addSummaryCards(doc, y, report.summary, report.currency);

    if (chartNodes.trend) y = await addChartImage(doc, chartNodes.trend, y, "Sales Trend (Revenue by Day)");
    if (chartNodes.topProducts) y = await addChartImage(doc, chartNodes.topProducts, y, "Top Selling Products");
    if (chartNodes.paymentDist) y = await addChartImage(doc, chartNodes.paymentDist, y, "Payment Method Distribution");
    if (chartNodes.statusDist) y = await addChartImage(doc, chartNodes.statusDist, y, "Order Status Distribution");

    y = addTopProductsTable(doc, y, report.top_products, report.currency);
    y = addPaymentSummaryTable(doc, y, report.payment_summary, report.currency);
    addSalesDetailsTable(doc, y, report.sales_details, report.currency);

    addFootersAndPageNumbers(doc);
    doc.save(`faiha-sales-report-${report.date_from}_to_${report.date_to}.pdf`);
}
