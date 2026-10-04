import os
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.pdfgen import canvas

OUT_DIR = Path(r"C:\Users\chakr\.gemini\antigravity\scratch\Need2Done\docs\NEED2DONE_LAUNCH\01_BUSINESS_REGISTRATION_&_LICENSES")
OUT_DIR.mkdir(parents=True, exist_ok=True)

PDF_PATH = OUT_DIR / "Need2Done_Official_Business_Registration_Details.pdf"
DOCX_PATH = OUT_DIR / "Need2Done_Official_Business_Registration_Details.docx"

NAVY_COLOR = colors.HexColor("#022B5E")
ORANGE_COLOR = colors.HexColor("#FF7D00")
DARK_TEXT = colors.HexColor("#1E293B")
LIGHT_BG = colors.HexColor("#F8FAFC")
BORDER_COLOR = colors.HexColor("#CBD5E1")

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header
        self.drawString(54, letter[1] - 36, "Need2Done (N2D) — Official Statutory & Registration Profile")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, letter[1] - 42, letter[0] - 54, letter[1] - 42)

        # Footer
        self.setFont("Helvetica", 8)
        self.drawString(54, 36, "Confidential • Statutory Filing & Payment Gateway KYC Reference")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 36, page_str)
        self.line(54, 46, letter[0] - 54, 46)

        self.restoreState()


def build_pdf():
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    doc_title_style = ParagraphStyle(
        'DocTitle',
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=NAVY_COLOR,
        spaceAfter=3
    )

    doc_sub_style = ParagraphStyle(
        'DocSub',
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=10
    )

    section_heading = ParagraphStyle(
        'SecHead',
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=NAVY_COLOR,
        spaceBefore=11,
        spaceAfter=5,
        keepWithNext=True
    )

    field_label_style = ParagraphStyle(
        'FieldLabel',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=NAVY_COLOR
    )

    field_val_style = ParagraphStyle(
        'FieldVal',
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=DARK_TEXT
    )

    body_style = ParagraphStyle(
        'Body',
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=DARK_TEXT,
        spaceAfter=5
    )

    story = []

    # Title Banner
    story.append(Paragraph("Need2Done (N2D)", doc_title_style))
    story.append(Paragraph("Official Business Registration, Trade License, MSME & Payment Gateway KYC Profile", doc_sub_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ORANGE_COLOR, spaceBefore=0, spaceAfter=10))

    # SECTION 1: Master Registration Attributes Table
    story.append(Paragraph("1. Primary Business Identification & Attributes", section_heading))

    table_data = [
        [Paragraph("Field Name", field_label_style), Paragraph("Official Registration Details", field_label_style)],
        [Paragraph("<b>Proprietor / Applicant Name</b>", field_label_style), Paragraph("[Your Full Name as per PAN / Aadhaar Card]", field_val_style)],
        [Paragraph("<b>Aadhaar Number</b>", field_label_style), Paragraph("<i>[NA — To be entered by Applicant during form submission]</i>", field_val_style)],
        [Paragraph("<b>Trade Name (Business Name)</b>", field_label_style), Paragraph("<b>Need2Done</b> <i>(Alternative: Need2Done Technologies / Need2Done Services)</i>", field_val_style)],
        [Paragraph("<b>Business Entity Type</b>", field_label_style), Paragraph("<b>Sole Proprietorship</b> <i>(or Partnership / LLP / Pvt Ltd as applicable)</i>", field_val_style)],
        [Paragraph("<b>Nature of Business</b>", field_label_style), Paragraph("<b>Services / Technology Platform / Hyperlocal E-Commerce Intermediary</b>", field_val_style)],
        [Paragraph("<b>Primary NIC Codes (MSME / GST)</b>", field_label_style), Paragraph("<b>63112 / 63999</b> (Web portals, data processing & IT enabled services)<br/><b>96099</b> (Other personal service activities n.e.c.)<br/><b>53200</b> (Other postal & courier / delivery activities)", field_val_style)],
        [Paragraph("<b>Operating Website URL</b>", field_label_style), Paragraph("<b>https://need2done.in</b>", field_val_style)],
        [Paragraph("<b>Official Contact Helpline</b>", field_label_style), Paragraph("<b>+91 7989862623</b>", field_val_style)],
        [Paragraph("<b>Official Support Email</b>", field_label_style), Paragraph("<b>support@need2done.in</b>", field_val_style)],
        [Paragraph("<b>Official Support Channels</b>", field_label_style), Paragraph("WhatsApp Business Bot & Web Intermediary Portal", field_val_style)]
    ]

    t = Table(table_data, colWidths=[165, 339])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('LINEBELOW', (0, 0), (-1, 0), 1.2, NAVY_COLOR),
    ]))
    story.append(t)
    story.append(Spacer(1, 6))

    # SECTION 2: Business Activity
    story.append(Paragraph("2. Official Business Activity", section_heading))
    story.append(Paragraph(
        "<b>Information Technology Enabled Services (ITeS) & Multi-Category Hyperlocal Marketplace Intermediary</b> connecting local residential customers with verified independent delivery partners, runners, and domestic service providers across Home Services, Medicine Delivery, Custom Work & Errands, Food & Grocery fulfillment, and Fresh Produce logistics via automated digital channels (WhatsApp Bot & Web Portals).",
        body_style
    ))

    # SECTION 3: Business Description
    story.append(Paragraph("3. Detailed Business Description (For Bank / Payment Gateway / Govt Portals)", section_heading))
    story.append(Paragraph(
        "<b>Need2Done</b> is a technology-driven multi-service hyperlocal convenience platform facilitating on-demand domestic support, residential deep cleaning, prescription pharmacy pickup, custom errand execution, food delivery, and daily essential procurement. Operating strictly as a digital intermediary under Section 79 of the Information Technology Act, 2000, Need2Done provides real-time GPS dispatching, automated order lifecycle tracking, and secure digital payment processing connecting consumers with local merchants and independent service partners.",
        body_style
    ))

    # SECTION 4: Comprehensive Multi-Service Scope
    story.append(Paragraph("4. Comprehensive Multi-Service Verticals", section_heading))
    
    verticals_data = [
        [Paragraph("Service Vertical", field_label_style), Paragraph("Operational Scope & Service Description", field_label_style)],
        [
            Paragraph("<b>1. Home Services (HS)</b>", field_label_style),
            Paragraph("On-demand domestic assistance including <b>Home Deep Cleaning</b>, <b>Kitchen Cleaning</b>, <b>Bathroom Scrubbing & Sanitization</b>, <b>Dishwashing Assistance</b>, <b>Laundry & Ironing Help</b>, and <b>Fan/Window Cleaning</b> by verified helpers.", field_val_style)
        ],
        [
            Paragraph("<b>2. Medicine Delivery (Medi)</b>", field_label_style),
            Paragraph("Doorstep collection and delivery of prescription medications and OTC wellness products from licensed local retail pharmacies against valid customer prescription uploads.", field_val_style)
        ],
        [
            Paragraph("<b>3. Custom Work & Errands</b>", field_label_style),
            Paragraph("On-demand personalized errands, custom tasks, item/document pick-and-drop, queue standing, and tailored domestic assistance requested by customers.", field_val_style)
        ],
        [
            Paragraph("<b>4. Food Delivery</b>", field_label_style),
            Paragraph("Ordering and doorstep delivery of prepared meals and beverages from local restaurants and food vendors.", field_val_style)
        ],
        [
            Paragraph("<b>5. Grocery Delivery</b>", field_label_style),
            Paragraph("Procurement and delivery of daily household groceries and packaged goods from neighborhood supermarkets.", field_val_style)
        ],
        [
            Paragraph("<b>6. Fruits & Vegetables</b>", field_label_style),
            Paragraph("Collection and delivery of fresh farm produce and greens from local retail mandis and fresh produce vendors.", field_val_style)
        ],
        [
            Paragraph("<b>7. Mobility & Rides</b>", field_label_style),
            Paragraph("Point-to-point urban mobility and commuter transport services (where locally permitted and licensed).", field_val_style)
        ]
    ]

    t_v = Table(verticals_data, colWidths=[140, 364])
    t_v.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 1), (-1, 1), LIGHT_BG),
        ('BACKGROUND', (0, 3), (-1, 3), LIGHT_BG),
        ('BACKGROUND', (0, 5), (-1, 5), LIGHT_BG),
        ('BACKGROUND', (0, 7), (-1, 7), LIGHT_BG),
    ]))
    story.append(t_v)
    story.append(Spacer(1, 6))

    # SECTION 5: Payment Gateway Mapping (Razorpay / PayU)
    story.append(Paragraph("5. Payment Gateway (Razorpay) Category Mapping", section_heading))
    pg_data = [
        [Paragraph("<b>Merchant Category:</b>", field_label_style), Paragraph("Services", field_val_style)],
        [Paragraph("<b>Merchant Sub-Category:</b>", field_label_style), Paragraph("Facility Services / Cleaning & Home Maintenance Services (or Internet & Information Services)", field_val_style)],
        [Paragraph("<b>Operating Website URL:</b>", field_label_style), Paragraph("https://need2done.in", field_val_style)],
        [Paragraph("<b>Customer Support Helpline:</b>", field_label_style), Paragraph("+91 7989862623", field_val_style)],
        [Paragraph("<b>Support Email:</b>", field_label_style), Paragraph("support@need2done.in", field_val_style)],
        [Paragraph("<b>Billing Descriptor:</b>", field_label_style), Paragraph("NEED2DONE", field_val_style)]
    ]
    t_pg = Table(pg_data, colWidths=[165, 339])
    t_pg.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_pg)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[PDF OK] {PDF_PATH.name}")


def build_docx():
    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("Need2Done (N2D) — Official Registration Profile")
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(148, 163, 184)

        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("Confidential • Official Statutory & KYC Filing Reference")
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(148, 163, 184)

    # Title
    p_title = doc.add_paragraph()
    r_title = p_title.add_run("Need2Done (N2D)")
    r_title.bold = True
    r_title.font.size = Pt(18)
    r_title.font.color.rgb = RGBColor(2, 43, 94)

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(10)
    r_sub = p_sub.add_run("Official Business Registration, Trade License, MSME & Payment Gateway KYC Profile")
    r_sub.font.size = Pt(9.5)
    r_sub.font.color.rgb = RGBColor(100, 116, 139)

    def add_h(text, color=(2, 43, 94)):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(3)
        r = p.add_run(text)
        r.bold = True
        r.font.size = Pt(11)
        r.font.color.rgb = RGBColor(*color)

    # Section 1
    add_h("1. Primary Business Identification & Attributes")
    items = [
        ("Proprietor / Applicant Name", "[Your Full Name as per PAN / Aadhaar Card]"),
        ("Aadhaar Number", "[NA — To be entered by Applicant during form submission]"),
        ("Trade Name (Business Name)", "Need2Done (Alternative: Need2Done Technologies / Need2Done Services)"),
        ("Business Entity Type", "Sole Proprietorship (or Partnership / LLP / Pvt Ltd as applicable)"),
        ("Nature of Business", "Services / Technology Platform / Hyperlocal E-Commerce Intermediary"),
        ("Primary NIC Codes (MSME / GST)", "63112 / 63999 (Web portals & ITeS), 96099 (Other personal services), 53200 (Courier / delivery)"),
        ("Operating Website URL", "https://need2done.in"),
        ("Official Contact Helpline", "+91 7989862623"),
        ("Official Support Email", "support@need2done.in"),
        ("Official Support Channels", "WhatsApp Business Bot & Web Intermediary Portal")
    ]

    t = doc.add_table(rows=len(items) + 1, cols=2)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.rows[0].cells[0].paragraphs[0].add_run("Field Name").bold = True
    t.rows[0].cells[1].paragraphs[0].add_run("Official Registration Details").bold = True

    for i, (k, v) in enumerate(items):
        r_cells = t.rows[i + 1].cells
        rk = r_cells[0].paragraphs[0].add_run(k)
        rk.bold = True
        rk.font.size = Pt(8.5)
        rv = r_cells[1].paragraphs[0].add_run(v)
        rv.font.size = Pt(8.5)

    doc.add_paragraph()

    # Section 2
    add_h("2. Official Business Activity")
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.add_run("Information Technology Enabled Services (ITeS) & Multi-Category Hyperlocal Marketplace Intermediary connecting local residential customers with verified independent delivery partners, runners, and domestic service providers across Home Services, Medicine Delivery, Custom Work & Errands, Food & Grocery fulfillment, and Fresh Produce logistics via automated digital channels (WhatsApp Bot & Web Portals).")

    # Section 3
    add_h("3. Detailed Business Description")
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.add_run("Need2Done is a technology-driven multi-service hyperlocal convenience platform facilitating on-demand domestic support, residential deep cleaning, prescription pharmacy pickup, custom errand execution, food delivery, and daily essential procurement. Operating strictly as a digital intermediary under Section 79 of the Information Technology Act, 2000, Need2Done provides real-time GPS dispatching, automated order lifecycle tracking, and secure digital payment processing connecting consumers with local merchants and independent service partners.")

    # Section 4
    add_h("4. Comprehensive Multi-Service Verticals")
    verticals = [
        ("1. Home Services (HS):", "On-demand domestic assistance including Home Deep Cleaning, Kitchen Cleaning, Bathroom Cleaning & Sanitization, Dishwashing, Laundry & Ironing, and Fan/Window Cleaning by verified helpers."),
        ("2. Medicine Delivery (Medi):", "Doorstep collection and delivery of prescription medications and OTC wellness products from licensed local retail pharmacies against valid customer prescription uploads."),
        ("3. Custom Work & Errands:", "On-demand personalized errands, custom tasks, item/document pick-and-drop, queue standing, and tailored domestic assistance requested by customers."),
        ("4. Food Delivery:", "Ordering and doorstep delivery of prepared meals and beverages from local restaurants and food vendors."),
        ("5. Grocery Delivery:", "Procurement and delivery of daily household groceries and packaged goods from neighborhood supermarkets."),
        ("6. Fruits & Vegetables:", "Collection and delivery of fresh farm produce and greens from local retail mandis and fresh produce vendors."),
        ("7. Mobility & Rides:", "Point-to-point urban mobility and commuter transport services (where locally permitted and licensed).")
    ]
    for v_title, v_desc in verticals:
        bp = doc.add_paragraph(style='List Bullet')
        bp.paragraph_format.space_after = Pt(2)
        r1 = bp.add_run(f"{v_title} ")
        r1.bold = True
        bp.add_run(v_desc)

    doc.save(str(DOCX_PATH))
    print(f"[DOCX OK] {DOCX_PATH.name}")


if __name__ == "__main__":
    build_pdf()
    build_docx()
