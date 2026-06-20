import io
import csv
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

class ValidadorDatos:
    @staticmethod
    def validar_dni(dni):
        """Valida que el DNI sea numérico y tenga entre 8 y 12 caracteres."""
        if not dni:
            return False
        return dni.isdigit() and (8 <= len(dni) <= 12)

    @staticmethod
    def validar_fechas(fecha_inicio_sintomas, fecha_notificacion):
        """Valida que la fecha de inicio de síntomas sea anterior o igual a la notificación."""
        if not fecha_inicio_sintomas or not fecha_notificacion:
            return True # Opcional en BD
            
        try:
            if isinstance(fecha_inicio_sintomas, str):
                f_ini = datetime.strptime(fecha_inicio_sintomas, '%Y-%m-%d').date()
            else:
                f_ini = fecha_inicio_sintomas
                
            if isinstance(fecha_notificacion, str):
                f_not = datetime.strptime(fecha_notificacion, '%Y-%m-%d').date()
            else:
                f_not = fecha_notificacion
                
            return f_ini <= f_not
        except Exception:
            return False


class Hasher:
    @staticmethod
    def hashear_password(password):
        return generate_password_hash(password)

    @staticmethod
    def verificar_password(password, pw_hash):
        return check_password_hash(pw_hash, password)

class ExportadorReportes:
    @staticmethod
    def exportar_csv_consolidado(titulo, indicadores, geografia, serotipos):
        output = io.StringIO()
        # Escribir UTF-8 con BOM para compatibilidad con Excel
        output.write('\ufeff')
        writer = csv.writer(output, delimiter=',')
        
        # Información de metadatos
        writer.writerow([titulo])
        writer.writerow(["SIVED-Perú — Reporte Oficial Epidemiológico"])
        writer.writerow([f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}"])
        writer.writerow([])
        
        # 1. Resumen general
        writer.writerow(["=== 1. RESUMEN DE INDICADORES GENERALES ==="])
        writer.writerow(["Indicador", "Valor"])
        writer.writerow(["Total de Casos Notificados", indicadores.get('total_casos', 0)])
        writer.writerow(["Casos Confirmados", indicadores.get('total_confirmados', 0)])
        writer.writerow(["Casos Probables", indicadores.get('total_casos', 0) - indicadores.get('total_confirmados', 0)])
        writer.writerow(["Total de Defunciones", indicadores.get('total_fallecidos', 0)])
        writer.writerow(["Tasa de Letalidad (%)", f"{indicadores.get('letalidad', 0.0)}%"])
        writer.writerow(["Tasa de Incidencia (por 100k hab.)", indicadores.get('incidencia', 0.0)])
        writer.writerow(["Alertas Activas Detectadas", indicadores.get('alertas', 0)])
        writer.writerow([])
        
        # 2. Geografía
        writer.writerow(["=== 2. DISTRIBUCION EPIDEMIOLOGICA GEOGRAFICA ==="])
        writer.writerow(["Ubicación", "Casos Notificados", "Defunciones", "Letalidad (%)"])
        for g in geografia:
            writer.writerow([
                g.get('nombre_lugar'),
                g.get('casos', 0),
                g.get('fallecidos', 0),
                f"{g.get('letalidad_pct', 0.0)}%"
            ])
        writer.writerow([])
        
        # 3. Serotipos
        writer.writerow(["=== 3. DISTRIBUCION POR SEROTIPO ==="])
        writer.writerow(["Serotipo", "Casos Notificados"])
        for s in serotipos:
            writer.writerow([
                s.get('serotipo') or 'No Tipificado',
                s.get('casos', 0)
            ])
            
        return output.getvalue()

    @staticmethod
    def exportar_pdf_consolidado(titulo, indicadores, geografia, serotipos):
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
        )
        
        styles = getSampleStyleSheet()
        
        # Estilos personalizados
        style_title = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=16,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=5,
            alignment=1
        )
        
        style_meta = ParagraphStyle(
            'MetaStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            textColor=colors.HexColor('#64748B'),
            spaceAfter=15,
            alignment=1
        )
        
        style_section = ParagraphStyle(
            'SectionStyle',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=11,
            textColor=colors.HexColor('#1E3A8A'),
            spaceBefore=12,
            spaceAfter=8
        )
        
        style_cell = ParagraphStyle(
            'CellStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            textColor=colors.HexColor('#334155')
        )
        
        style_header = ParagraphStyle(
            'HeaderStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            textColor=colors.white
        )

        elements = []
        
        # Cabecera
        elements.append(Paragraph(titulo, style_title))
        fecha_gen = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
        elements.append(Paragraph(f"Reporte Consolidado Epidemiológico Oficial — SIVED-Perú | Generado: {fecha_gen}", style_meta))
        
        # --- TABLA 1: INDICADORES GENERALES ---
        elements.append(Paragraph("1. Resumen de Indicadores Generales", style_section))
        ind_headers = ["Indicador", "Valor"]
        ind_rows = [
            ["Total de Casos Notificados", str(indicadores.get('total_casos', 0))],
            ["Casos Confirmados", str(indicadores.get('total_confirmados', 0))],
            ["Casos Probables", str(indicadores.get('total_casos', 0) - indicadores.get('total_confirmados', 0))],
            ["Total de Defunciones", str(indicadores.get('total_fallecidos', 0))],
            ["Tasa de Letalidad (%)", f"{indicadores.get('letalidad', 0.0)}%"],
            ["Tasa de Incidencia (por 100k hab.)", str(indicadores.get('incidencia', 0.0))],
            ["Alertas Activas", str(indicadores.get('alertas', 0))]
        ]
        
        t1_data = [[Paragraph(h, style_header) for h in ind_headers]]
        for row in ind_rows:
            t1_data.append([Paragraph(cell, style_cell) for cell in row])
            
        t1 = Table(t1_data, colWidths=[doc.width * 0.7, doc.width * 0.3])
        t1.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#F8FAFC'), colors.white]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0,0), (-1,-1), 5),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elements.append(t1)
        elements.append(Spacer(1, 10))
        
        # --- TABLA 2: DISTRIBUCIÓN GEOGRÁFICA ---
        elements.append(Paragraph("2. Distribución Epidemiológica Geográfica", style_section))
        geo_headers = ["Ubicación", "Casos Notificados", "Defunciones", "Letalidad (%)"]
        t2_data = [[Paragraph(h, style_header) for h in geo_headers]]
        for g in geografia:
            t2_data.append([
                Paragraph(g.get('nombre_lugar') or 'Desconocido', style_cell),
                Paragraph(str(g.get('casos', 0)), style_cell),
                Paragraph(str(g.get('fallecidos', 0)), style_cell),
                Paragraph(f"{g.get('letalidad_pct', 0.0)}%", style_cell),
            ])
            
        t2 = Table(t2_data, colWidths=[doc.width * 0.4, doc.width * 0.2, doc.width * 0.2, doc.width * 0.2])
        t2.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#F8FAFC'), colors.white]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0,0), (-1,-1), 4),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elements.append(t2)
        elements.append(Spacer(1, 10))
        
        # --- TABLA 3: DISTRIBUCIÓN DE SEROTIPOS ---
        elements.append(Paragraph("3. Distribución por Serotipo Clínico", style_section))
        sero_headers = ["Serotipo", "Casos Notificados"]
        t3_data = [[Paragraph(h, style_header) for h in sero_headers]]
        for s in serotipos:
            t3_data.append([
                Paragraph(s.get('serotipo') or 'No Tipificado', style_cell),
                Paragraph(str(s.get('casos', 0)), style_cell)
            ])
            
        t3 = Table(t3_data, colWidths=[doc.width * 0.6, doc.width * 0.4])
        t3.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#F8FAFC'), colors.white]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0,0), (-1,-1), 4),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elements.append(t3)
        
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
