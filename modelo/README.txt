MODELO LOCAL DE TEACHABLE MACHINE

En esta carpeta todavía no hay un modelo ni el runtime de TensorFlow.js; por eso el modo offline de clasificación no funciona hasta que se agreguen.

1. En Teachable Machine, entrena y exporta un proyecto de reconocimiento de imágenes como TensorFlow.js.
2. Copia aquí model.json, metadata.json y todos los archivos .bin del modelo exportado.
3. Copia también las versiones compatibles de tf.min.js y teachablemachine-image.min.js. Deben servirse desde esta misma carpeta, no desde un CDN, para que puedan quedar disponibles sin conexión.
4. El modelo debe incluir las seis categorías: Botella_plastica, Lata, Papel_carton, Organico, No_aprovechable y Otro. Se aceptan los nombres equivalentes reconocidos por la app. La carga verifica que estén presentes; si falta alguna, indica cuáles y no declara el modelo listo.
5. Cambia "enabled" a true en config.json.
6. Vuelve a desplegar en Vercel. Inicia sesión, abre Escanear residuo con conexión y espera a que el estado indique que Teachable Machine está listo; al cargarlo, el service worker guarda el modelo y sus archivos. Después prueba una clasificación online y otra sin conexión antes de usarlo en clase.

La aplicación carga el modelo exportado mediante el runtime oficial local de Teachable Machine, toma la clase con mayor confianza y solo asigna puntos cuando la confianza es de al menos 75 %. Gemini funciona online y el modelo local puede funcionar offline cuando esos archivos estén instalados.

Las respuestas válidas de Gemini se guardan automáticamente en el dispositivo, incluso si su confianza es baja o la clase es Otro. La app no aprende ni modifica el modelo automáticamente. En la pantalla Escanear residuo, descarga el ZIP de ejemplos para obtener las imágenes separadas en carpetas por categoría. Revisa las categorías antes de incorporarlas a un entrenamiento: Gemini puede equivocarse. Este ZIP es un conjunto de ejemplos, no un modelo entrenado; importa las imágenes en Teachable Machine, entrena y exporta un modelo nuevo, y luego reemplaza los archivos del modelo local y vuelve a publicar. Los ejemplos quedan en el dispositivo donde se capturaron y no se suben a Supabase.
