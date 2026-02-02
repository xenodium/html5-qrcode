/**
 * @fileoverview
 * Shim layer for providing the decoding library.
 * 
 * @author mebjas <minhazav@gmail.com>
 * 
 * The word "QR Code" is registered trademark of DENSO WAVE INCORPORATED
 * http://www.denso-wave.com/qrcode/faqpatent-e.html
 */

import {
    QrcodeResult,
    QrcodeResultFormat,
    Html5QrcodeSupportedFormats,
    Logger,
    QrcodeDecoderAsync,
    RobustQrcodeDecoderAsync,
} from "./core";

import { ZXingHtml5QrcodeDecoder } from "./zxing-html5-qrcode-decoder";
import { BarcodeDetectorDelegate } from "./native-bar-code-detector";
import { decodeTelepenFromCanvas } from "./telepen-decoder";

/**
 * Shim layer for {@interface QrcodeDecoder}.
 *
 * Currently uses {@class ZXingHtml5QrcodeDecoder}, can be replace with another library.
 */
export class Html5QrcodeShim implements RobustQrcodeDecoderAsync {

    private verbose: boolean;
    private primaryDecoder: QrcodeDecoderAsync;
    private secondaryDecoder: QrcodeDecoderAsync | undefined;
    private telepenRequested: boolean;

    private readonly EXECUTIONS_TO_REPORT_PERFORMANCE = 100;
    private executions: number = 0;
    private executionResults: Array<number> = [];
    private wasPrimaryDecoderUsedInLastDecode = false;

    public constructor(
        requestedFormats: Array<Html5QrcodeSupportedFormats>,
        useBarCodeDetectorIfSupported: boolean,
        verbose: boolean,
        logger: Logger) {
        this.verbose = verbose;
        this.telepenRequested = requestedFormats.includes(
            Html5QrcodeSupportedFormats.TELEPEN_NUMERIC);

        // Use BarcodeDetector library if enabled by config and is supported.
        if (useBarCodeDetectorIfSupported
                && BarcodeDetectorDelegate.isSupported()) {
            this.primaryDecoder = new BarcodeDetectorDelegate(
                requestedFormats, verbose, logger);
            // If 'BarcodeDetector' is supported, the library will alternate
            // between 'BarcodeDetector' and 'zxing-js' to compensate for
            // quality gaps between the two.
            this.secondaryDecoder = new ZXingHtml5QrcodeDecoder(
                requestedFormats, verbose, logger);
        } else {
            this.primaryDecoder = new ZXingHtml5QrcodeDecoder(
                requestedFormats, verbose, logger);
        }
    }

    async decodeAsync(canvas: HTMLCanvasElement): Promise<QrcodeResult> {
        let startTime = performance.now();
        try {
            // If Telepen is requested, try it first since neither BarcodeDetector
            // nor ZXing support it natively. This ensures camera scanning works
            // for Telepen barcodes on every frame.
            if (this.telepenRequested) {
                const telepenResult = decodeTelepenFromCanvas(canvas);
                if (telepenResult) {
                    return {
                        text: telepenResult,
                        format: QrcodeResultFormat.create(
                            Html5QrcodeSupportedFormats.TELEPEN_NUMERIC),
                        debugData: { decoderName: "telepen-decoder" }
                    };
                }
            }

            // Fall back to standard decoders for other formats
            return await this.getDecoder().decodeAsync(canvas);
        } finally {
            this.possiblyLogPerformance(startTime);
        }
    }

    async decodeRobustlyAsync(canvas: HTMLCanvasElement)
        : Promise<QrcodeResult> {
        let startTime = performance.now();
        try {
            // Try Telepen first if requested
            if (this.telepenRequested) {
                const telepenResult = decodeTelepenFromCanvas(canvas);
                if (telepenResult) {
                    return {
                        text: telepenResult,
                        format: QrcodeResultFormat.create(
                            Html5QrcodeSupportedFormats.TELEPEN_NUMERIC),
                        debugData: { decoderName: "telepen-decoder" }
                    };
                }
            }

            return await this.primaryDecoder.decodeAsync(canvas);
        } catch(error) {
            if (this.secondaryDecoder) {
                // Try fallback.
                return this.secondaryDecoder.decodeAsync(canvas);
            }
            throw error;
        } finally {
            this.possiblyLogPerformance(startTime);
        }
    }

    private getDecoder(): QrcodeDecoderAsync {
        if (!this.secondaryDecoder) {
            return this.primaryDecoder;
        }

        if (this.wasPrimaryDecoderUsedInLastDecode === false) {
            this.wasPrimaryDecoderUsedInLastDecode = true;
            return this.primaryDecoder;
        }
        this.wasPrimaryDecoderUsedInLastDecode = false;
        return this.secondaryDecoder;
    }

    private possiblyLogPerformance(startTime: number) {
        if (!this.verbose) {
            return;
        }
        let executionTime = performance.now() - startTime;
        this.executionResults.push(executionTime);
        this.executions++;
        this.possiblyFlushPerformanceReport();
    }

    // Dumps mean decoding latency to console for last
    // EXECUTIONS_TO_REPORT_PERFORMANCE runs.
    // TODO(mebjas): Can we automate instrumentation runs?
    possiblyFlushPerformanceReport() {
        if (this.executions < this.EXECUTIONS_TO_REPORT_PERFORMANCE) {
            return;
        }

        let sum:number = 0;
        for (let executionTime of this.executionResults) {
            sum += executionTime;
        }
        let mean = sum / this.executionResults.length;
        // eslint-disable-next-line no-console
        console.log(`${mean} ms for ${this.executionResults.length} last runs.`);
        this.executions = 0;
        this.executionResults = [];
    }
}
