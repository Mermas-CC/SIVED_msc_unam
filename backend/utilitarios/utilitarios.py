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
    def exportar_csv(encabezados, filas):
        """Genera un archivo CSV en memoria y retorna su contenido como string."""
        output = io.StringIO()
        # Escribir UTF-8 con BOM para que Excel reconozca caracteres especiales en español
        output.write('\ufeff')
        writer = csv.writer(output, delimiter=',')
        writer.writerow(encabezados)
        writer.writerows(filas)
        return output.getvalue()

    @staticmethod
    def exportar_pdf(titulo, encabezados, filas):
        """Genera un reporte PDF formal utilizando ReportLab y lo retorna como bytes."""
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
            fontSize=18,
            textColor=colors.HexColor('#0F172A'), # Slate 900
            spaceAfter=20,
            alignment=1 # Centrado
        )
        
        style_meta = ParagraphStyle(
            'MetaStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            textColor=colors.HexColor('#64748B'), # Slate 500
            spaceAfter=15
        )
        
        style_cell = ParagraphStyle(
            'CellStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            textColor=colors.HexColor('#334155') # Slate 700
        )
        
        style_header = ParagraphStyle(
            'HeaderStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            textColor=colors.white
        )

        elements = []
        
        # Título y metadatos
        elements.append(Paragraph(titulo, style_title))
        fecha_gen = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
        elements.append(Paragraph(f"SIVED-Perú — Reporte Oficial Epidemiológico | Generado el: {fecha_gen}", style_meta))
        elements.append(Spacer(1, 10))
        
        # Estructurar tabla
        data = []
        # Añadir cabecera
        data.append([Paragraph(h, style_header) for h in encabezados])
        # Añadir filas
        for fila in filas:
            data.append([Paragraph(str(celda), style_cell) for celda in fila])
            
        # Calcular anchos de columna basados en la cantidad de columnas
        col_width = (doc.width) / len(encabezados)
        
        t = Table(data, colWidths=[col_width] * len(encabezados))
        
        # Estilo de tabla premium (colores harmoniosos de la paleta)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')), # Slate 800 para cabeceras
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('TOPPADDING', (0,0), (-1,0), 6),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#F8FAFC'), colors.white]), # Alternancia
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')), # Bordes grises finos
            ('BOTTOMPADDING', (0,1), (-1,-1), 4),
            ('TOPPADDING', (0,1), (-1,-1), 4),
        ]))
        
        elements.append(t)
        
        # Construir documento
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
