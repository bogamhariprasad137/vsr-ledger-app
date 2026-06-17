import io
import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_receipt_pdf(receipt, parent_name, remaining_balance, fee_category, admission_number, installment_number):
    """
    Generates a professional PDF receipt using ReportLab.
    Returns a bytes object containing the PDF content.
    """
    buffer = io.BytesIO()
    
    # Page setup
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'ReceiptTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#4B2E21'), # Custom sidebar brown
        alignment=1 # Centered
    )
    
    subtitle_style = ParagraphStyle(
        'ReceiptSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#78716C'), # Neutral mute
        alignment=1
    )
    
    section_title = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#4B2E21'),
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'ReceiptBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#1C1917')
    )
    
    bold_style = ParagraphStyle(
        'ReceiptBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    elements = []
    
    # Header Banner
    elements.append(Paragraph("FIRSTCRY INTELLITOTS PORTAL", title_style))
    elements.append(Paragraph("Official Payment Receipt & Fee Settlement Ledger", subtitle_style))
    elements.append(Spacer(1, 15))
    
    # Decorative line
    line_data = [['']]
    line_table = Table(line_data, colWidths=[540], rowHeights=[2])
    line_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F2E6B3')), # Brand secondary warm gold
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 15))
    
    # Receipt Details Table
    details_data = [
        [Paragraph("Receipt Number:", bold_style), Paragraph(receipt['receipt_number'], body_style),
         Paragraph("Payment Date:", bold_style), Paragraph(str(receipt['payment_date']), body_style)],
        [Paragraph("Payment Method:", bold_style), Paragraph(str(receipt['payment_method']).upper().replace('_', ' '), body_style),
         Paragraph("Status:", bold_style), Paragraph("COMPLETED & RECORDED", bold_style)]
    ]
    
    details_table = Table(details_data, colWidths=[110, 160, 100, 170])
    details_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(details_table)
    elements.append(Spacer(1, 15))
    
    # Student & Parent Information
    elements.append(Paragraph("Student & Parent Information", section_title))
    info_data = [
        [Paragraph("Student Name:", bold_style), Paragraph(receipt['student_name'], body_style),
         Paragraph("Admission Number:", bold_style), Paragraph(admission_number or 'N/A', body_style)],
        [Paragraph("Parent Name:", bold_style), Paragraph(parent_name or 'N/A', body_style),
         Paragraph("Installment Term:", bold_style), Paragraph(f"Installment #{installment_number}" if installment_number else 'N/A', body_style)],
        [Paragraph("Fee Category:", bold_style), Paragraph(fee_category or 'General Fee Account', body_style),
         Paragraph("", bold_style), Paragraph("", body_style)]
    ]
    
    info_table = Table(info_data, colWidths=[110, 160, 110, 160])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FFFDF7')), # Cream card background
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E7E5E4')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 15))
    
    # Payment Ledger Table
    elements.append(Paragraph("Transaction Breakdown", section_title))
    ledger_data = [
        [Paragraph("Description", bold_style), Paragraph("Allocated Category", bold_style), Paragraph("Amount Paid", bold_style)]
    ]
    
    # Categories split breakdown
    if fee_category:
        categories = fee_category.split(" & ")
        share = float(receipt['amount_paid']) / len(categories)
        for cat in categories:
            ledger_data.append([
                Paragraph(f"Installment Payment - {cat}", body_style),
                Paragraph(cat, body_style),
                Paragraph(f"INR {share:.2f}", body_style)
            ])
    else:
        ledger_data.append([
            Paragraph("Installment Payment", body_style),
            Paragraph("General Fee", body_style),
            Paragraph(f"INR {float(receipt['amount_paid']):.2f}", body_style)
        ])
        
    # Totals
    ledger_data.append([Paragraph("", body_style), Paragraph("Total Amount Settled:", bold_style), Paragraph(f"INR {float(receipt['amount_paid']):.2f}", bold_style)])
    ledger_data.append([Paragraph("", body_style), Paragraph("Remaining Student Balance:", bold_style), Paragraph(f"INR {float(remaining_balance):.2f}", bold_style)])
    
    ledger_table = Table(ledger_data, colWidths=[240, 160, 140])
    ledger_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F5F5F4')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E7E5E4')),
        ('LINEBELOW', (0,0), (-1,0), 1, colors.HexColor('#D6D3D1')),
        ('LINEBELOW', (0,-3), (-1,-3), 1.5, colors.HexColor('#4B2E21')), # Bold line before total
        ('PADDING', (0,0), (-1,-1), 8),
        ('ALIGN', (2,0), (2,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(ledger_table)
    elements.append(Spacer(1, 40))
    
    # Signature / Footer
    footer_data = [
        [Paragraph("Verified by: FirstCry Intellitots Finance Office", body_style)],
        [Paragraph("Thank you for your prompt payment. This is a computer-generated receipt and requires no physical signature.", subtitle_style)]
    ]
    footer_table = Table(footer_data, colWidths=[540])
    footer_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(footer_table)
    
    # Build Document
    doc.build(elements)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

def generate_report_pdf(report_type, metrics):
    """
    Generates a professional PDF report using ReportLab.
    report_type can be 'collections', 'arrears', or 'roster'.
    metrics is a dict containing relevant counts/lists.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#4B2E21'),
        alignment=1
    )
    
    subtitle_style = ParagraphStyle(
        'ReportSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#78716C'),
        alignment=1
    )
    
    section_title = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#4B2E21'),
        spaceBefore=10,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'ReportBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#1C1917')
    )
    
    bold_style = ParagraphStyle(
        'ReportBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    elements = []
    
    # Title
    title_text = "FEE SYSTEM AUDIT & METRICS REPORT"
    if report_type == "arrears":
        title_text = "ARREARS & OVERDUE OUTSTANDING REPORT"
    elif report_type == "roster":
        title_text = "STUDENT ENROLLMENT ROSTER DETAILS"
        
    elements.append(Paragraph("FIRSTCRY INTELLITOTS", title_style))
    elements.append(Paragraph(title_text, subtitle_style))
    elements.append(Spacer(1, 10))
    
    # Decorative line
    line_table = Table([['']], colWidths=[540], rowHeights=[2])
    line_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F2E6B3')),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 10))
    
    # Render Generated Date
    elements.append(Paragraph(f"<b>Generated Date:</b> {datetime.date.today().isoformat()} | <b>Currency:</b> INR (₹)", body_style))
    elements.append(Spacer(1, 10))
    
    # Render system metrics summary section
    elements.append(Paragraph("System Metrics Summary", section_title))
    summary_data = [
        [Paragraph("Metric Description", bold_style), Paragraph("Value / Aggregate Count", bold_style)],
        [Paragraph("Total Students Registered:", body_style), Paragraph(str(metrics.get('total_students', 0)), body_style)],
        [Paragraph("Total Fees Allocated (Billed):", body_style), Paragraph(f"INR {metrics.get('total_allocated', 0):,.2f}", body_style)],
        [Paragraph("Total Fees Collected (Paid):", body_style), Paragraph(f"INR {metrics.get('total_collected', 0):,.2f}", body_style)],
        [Paragraph("Total Pending Balance (Expected):", body_style), Paragraph(f"INR {metrics.get('total_pending', 0):,.2f}", body_style)],
        [Paragraph("Total Overdue Outstanding:", body_style), Paragraph(f"INR {metrics.get('total_overdue', 0):,.2f}", body_style)]
    ]
    summary_table = Table(summary_data, colWidths=[280, 260])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F5F5F4')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E7E5E4')),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#E7E5E4')),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 15))
    
    # Specific sections depending on type
    if report_type == "collections":
        elements.append(Paragraph("Fee Category Collections Progress", section_title))
        cat_data = [
            [Paragraph("Fee Category", bold_style), Paragraph("Allocated (Billed)", bold_style), Paragraph("Collected (Paid)", bold_style), Paragraph("Progress (%)", bold_style)],
            [Paragraph("Admission Fee", body_style), 
             Paragraph(f"INR {metrics.get('admission_allocated', 0):,.2f}", body_style),
             Paragraph(f"INR {metrics.get('admission_collected', 0):,.2f}", body_style),
             Paragraph(f"{metrics.get('admission_pct', 0):.1f}%", body_style)],
            [Paragraph("Term Fee", body_style), 
             Paragraph(f"INR {metrics.get('term_allocated', 0):,.2f}", body_style),
             Paragraph(f"INR {metrics.get('term_collected', 0):,.2f}", body_style),
             Paragraph(f"{metrics.get('term_pct', 0):.1f}%", body_style)],
            [Paragraph("Daycare Fee", body_style), 
             Paragraph(f"INR {metrics.get('daycare_allocated', 0):,.2f}", body_style),
             Paragraph(f"INR {metrics.get('daycare_collected', 0):,.2f}", body_style),
             Paragraph(f"{metrics.get('daycare_pct', 0):.1f}%", body_style)],
        ]
        cat_table = Table(cat_data, colWidths=[160, 130, 130, 120])
        cat_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F5F5F4')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E7E5E4')),
            ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#E7E5E4')),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(cat_table)
        
    elif report_type == "arrears":
        elements.append(Paragraph("Overdue Accounts Details", section_title))
        arrears_list = metrics.get('arrears_list', [])
        if arrears_list:
            arr_data = [
                [Paragraph("Student Name", bold_style), Paragraph("Parent Name", bold_style), Paragraph("Outstanding", bold_style), Paragraph("Days Overdue", bold_style)]
            ]
            for row in arrears_list:
                arr_data.append([
                    Paragraph(row.get('student_name', 'N/A'), body_style),
                    Paragraph(row.get('parent_name', 'N/A'), body_style),
                    Paragraph(f"INR {row.get('outstanding_amount', 0):,.2f}", body_style),
                    Paragraph(f"{row.get('days_overdue', 0)} days", body_style)
                ])
            arr_table = Table(arr_data, colWidths=[150, 150, 120, 120])
            arr_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F5F5F4')),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E7E5E4')),
                ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#E7E5E4')),
                ('PADDING', (0,0), (-1,-1), 6),
            ]))
            elements.append(arr_table)
        else:
            elements.append(Paragraph("No accounts are currently overdue or in arrears.", body_style))
            
    elif report_type == "roster":
        elements.append(Paragraph("Student Registration Roster", section_title))
        roster_list = metrics.get('roster_list', [])
        if roster_list:
            rost_data = [
                [Paragraph("Admission No", bold_style), Paragraph("Student Name", bold_style), Paragraph("Class", bold_style), Paragraph("Total Billed", bold_style), Paragraph("Total Paid", bold_style)]
            ]
            for row in roster_list:
                rost_data.append([
                    Paragraph(row.get('admission_number', 'N/A'), body_style),
                    Paragraph(row.get('student_name', 'N/A'), body_style),
                    Paragraph(row.get('class', 'N/A'), body_style),
                    Paragraph(f"INR {row.get('total_fee', 0):,.2f}", body_style),
                    Paragraph(f"INR {row.get('paid_amount', 0):,.2f}", body_style)
                ])
            rost_table = Table(rost_data, colWidths=[100, 140, 100, 100, 100])
            rost_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F5F5F4')),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E7E5E4')),
                ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#E7E5E4')),
                ('PADDING', (0,0), (-1,-1), 6),
            ]))
            elements.append(rost_table)
        else:
            elements.append(Paragraph("No students registered on the active roster.", body_style))
            
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("<b>End of Report.</b> This document is compiled directly from the school's live relational transaction database.", subtitle_style))
    
    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
