from PIL import Image, ImageEnhance, ImageFilter
import base64
from io import BytesIO
import os

class RadiologiaService:
    
    @staticmethod
    def procesar_imagen(imagen_base64):
        """Procesar imagen radiográfica"""
        # Decodificar base64
        img_data = base64.b64decode(imagen_base64.split(',')[1] if ',' in imagen_base64 else imagen_base64)
        img = Image.open(BytesIO(img_data))
        
        # Convertir a escala de grises si no lo está
        if img.mode != 'L':
            img = img.convert('L')
        
        # Mejoras automáticas
        # 1. Ajustar contraste
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.5)
        
        # 2. Ajustar brillo
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(1.2)
        
        # 3. Nitidez
        img = img.filter(ImageFilter.SHARPEN)
        
        # Convertir de vuelta a base64
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        return {
            'imagen_procesada': f"data:image/png;base64,{img_base64}",
            'ancho': img.width,
            'alto': img.height,
            'formato': 'PNG'
        }
    
    @staticmethod
    def ajustar_contraste(imagen_base64, factor):
        """Ajustar contraste de imagen"""
        img_data = base64.b64decode(imagen_base64.split(',')[1])
        img = Image.open(BytesIO(img_data))
        
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(factor)
        
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        return f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode()}"
    
    @staticmethod
    def ajustar_brillo(imagen_base64, factor):
        """Ajustar brillo de imagen"""
        img_data = base64.b64decode(imagen_base64.split(',')[1])
        img = Image.open(BytesIO(img_data))
        
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(factor)
        
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        return f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode()}"
    
    @staticmethod
    def invertir_colores(imagen_base64):
        """Invertir colores de radiografía"""
        img_data = base64.b64decode(imagen_base64.split(',')[1])
        img = Image.open(BytesIO(img_data))
        
        from PIL import ImageOps
        img = ImageOps.invert(img.convert('RGB'))
        
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        return f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode()}"
