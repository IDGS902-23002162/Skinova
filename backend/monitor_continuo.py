import os
import sys
import time
import signal
import argparse
import unittest
from datetime import datetime

# Forzar entorno de monitoreo antes de importar las suites de prueba:
# Activa Suite 1 + Suite 2 (sin Gemini) y bloquea explícitamente Suite 3 (Gemini real)
os.environ.setdefault("RUN_E2E_SIN_GEMINI", "true")
os.environ["RUN_E2E_GEMINI"] = "false"

from test_automatizados import (
    TestModulosPrincipalesSkinova,
    TestWorkflowUsuarioSinGemini,
    logger,
)

# Bandera global para detención limpia (Ctrl+C o systemctl stop)
ejecutando = True


def _manejar_salida(signum, frame):
    global ejecutando
    ejecutando = False


signal.signal(signal.SIGINT, _manejar_salida)
signal.signal(signal.SIGTERM, _manejar_salida)


def obtener_intervalo_segundos():
    parser = argparse.ArgumentParser(
        description="Ejecutor periódico de pruebas automáticas y SLA para Skinova"
    )
    parser.add_argument(
        "-s", "--segundos",
        type=int,
        default=None,
        help="Frecuencia de ejecución en segundos (ej. 30, 60, 300)"
    )
    args = parser.parse_args()

    if args.segundos is not None and args.segundos > 0:
        return args.segundos

    env_val = os.getenv("SLA_INTERVAL_SECONDS")
    if env_val and env_val.isdigit() and int(env_val) > 0:
        return int(env_val)

    print("\n=== CONFIGURACIÓN DE MONITOREO PERIÓDICO SKINOVA ===")
    print("Ejemplos de frecuencia: 30 (30 segs) | 60 (1 min) | 300 (5 mins)")
    while True:
        entrada = input("Ingresa cada cuántos segundos ejecutar las pruebas [default 60]: ").strip()
        if not entrada:
            return 60
        if entrada.isdigit() and int(entrada) > 0:
            return int(entrada)
        print("Por favor ingresa un número entero mayor a 0.")


def iniciar_monitoreo(intervalo_seg):
    loader = unittest.TestLoader()
    runner = unittest.TextTestRunner(stream=open(os.devnull, "w"), verbosity=0)

    ciclo = 0
    total_pruebas_acumuladas = 0
    total_exitosas_acumuladas = 0

    logger.info(
        f"*** MONITOREO PERIÓDICO INICIADO (SUITE 1 + SUITE 2 SIN GEMINI) | "
        f"FRECUENCIA CONFIGURADA: CADA {intervalo_seg} SEGUNDOS ***"
    )
    print(f"\n[OK] Monitoreo iniciado (Suite 1 + Suite 2). Ejecutando pruebas cada {intervalo_seg} segundos.")
    print("[INFO] Presiona Ctrl + C para detener y ver el resumen de SLA.\n")

    while ejecutando:
        ciclo += 1
        hora_actual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"--- CICLO #{ciclo} (Intervalo: {intervalo_seg}s) ---")

        # Cargar Suite 1 (Disponibilidad/Seguridad) + Suite 2 (Workflow usuario sin Gemini)
        suite = unittest.TestSuite()
        suite.addTests(loader.loadTestsFromTestCase(TestModulosPrincipalesSkinova))
        suite.addTests(loader.loadTestsFromTestCase(TestWorkflowUsuarioSinGemini))

        resultado = runner.run(suite)

        ejecutadas = resultado.testsRun
        fallidas = len(resultado.failures) + len(resultado.errors)
        exitosas = ejecutadas - fallidas

        total_pruebas_acumuladas += ejecutadas
        total_exitosas_acumuladas += exitosas
        disponibilidad_sla = round((total_exitosas_acumuladas / total_pruebas_acumuladas) * 100, 2)

        logger.info(
            f"RESUMEN CICLO #{ciclo}: Exitosas={exitosas}/{ejecutadas} | "
            f"Disponibilidad_Acumulada_SLA={disponibilidad_sla}%"
        )

        print(
            f"[{hora_actual}] Ciclo #{ciclo} completado -> "
            f"{exitosas}/{ejecutadas} PASS | SLA Acumulado: {disponibilidad_sla}% | "
            f"Siguiente ejecución en {intervalo_seg}s...",
            flush=True
        )

        # Espera fraccionada de 1s para responder de inmediato al detener el proceso
        for _ in range(intervalo_seg):
            if not ejecutando:
                break
            time.sleep(1)

    print("\n\n[DETENIDO] Monitoreo finalizado.")
    if total_pruebas_acumuladas > 0:
        sla_final = round((total_exitosas_acumuladas / total_pruebas_acumuladas) * 100, 2)
        logger.info(
            f"*** MONITOREO DETENIDO | CICLOS={ciclo} | TOTAL_PRUEBAS={total_pruebas_acumuladas} | "
            f"DISPONIBILIDAD_FINAL_SLA={sla_final}% ***\n"
        )
        print(f"Resumen guardado en backend/logs/skinova_sla.log (SLA Final: {sla_final}%).")
    sys.exit(0)


if __name__ == "__main__":
    segundos = obtener_intervalo_segundos()
    iniciar_monitoreo(segundos)