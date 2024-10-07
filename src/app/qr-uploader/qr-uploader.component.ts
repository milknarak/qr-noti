import { Component } from '@angular/core';
import { QrUploaderService } from './qr-uploader.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface QRParsedResult {
  bankRef?: string;
  billerNo?: string;
  ref1?: string;
  ref2?: string;
  customData?: any; // Adjust the type as needed for your custom data structure
  payerBank?: string;
  amount?: string;
  fee?: string;
  payerName?: string;
  qrId?: string;
  resultCode?: string;
  [key: string]: any;
  AID?: string; // Add AID as a property
  billerID?: string; // Add Biller ID as a property
}

@Component({
  selector: 'app-qr-uploader',
  templateUrl: './qr-uploader.component.html',
  styleUrl: './qr-uploader.component.css'
})
export class QrUploaderComponent {

  qrResult: QRParsedResult | null = null;
  qrForm: FormGroup;

  constructor(private creditNotiService: QrUploaderService, private fb: FormBuilder) {
    this.qrForm = this.fb.group({
      BankRef: ['refBank007'],
      BillerNo: [''],
      Ref1: [''],
      Ref2: [''],
      QRId: [''],
      PayerName: ['ทดสอบ ลอบรัก'],
      PayerBank: ['222'],
      Filler: [''],
      Amount: [''],
      Fee: ['0.00'],
      ResultCode: ['000'],
      ResultDesc: ['Successful'],
      TransDate: [this.formatDate()]
    });
  }

  private formatDate(): string {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace(/[-:T]/g, '');
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const imageUrl = e.target.result;
        this.readQRCode(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  }

  async readQRCode(imageUrl: string) {
    const codeReader = new BrowserMultiFormatReader();
    try {
      const result = await codeReader.decodeFromImageUrl(imageUrl);
      
      // Use the getText() method instead of accessing the private 'text' property
      const qrData = result.getText();
      
      this.parseQRData(qrData);
    } catch (err) {
      console.error('Error reading QR code:', err);
    }
  }

  parseQRData(qrData: string) {
    const result: any = {};
    let i = 0;
    console.log('rawData', qrData);

    while (i < qrData.length) {
        // Extract the ID (first 2 digits)
        const id = qrData.substring(i, i + 2);
        // Extract the length (next 2 digits)
        const length = parseInt(qrData.substring(i + 2, i + 4), 10);
        // Extract the value (the next 'length' characters)
        const value = qrData.substring(i + 4, i + 4 + length);

        // Map ID to result fields based on the provided table
        switch (id) {
            case '00':
                result.PayloadFormatIndicator = value;
                break;
            case '01':
                result.PointOfInitiationMethod = value;
                break;
            case '30': {  // Merchant Identifier contains nested subfields
                let subIndex = 0;
                while (subIndex < value.length) {
                    const subId = value.substring(subIndex, subIndex + 2);
                    const subLength = parseInt(value.substring(subIndex + 2, subIndex + 4), 10);
                    const subValue = value.substring(subIndex + 4, subIndex + 4 + subLength);

                    switch (subId) {
                        case '00':
                            result.AID = subValue;
                            break;
                        case '01': 
                            result.BillerNo = subValue; // Biller ID
                            break;
                        case '02': 
                            result.Ref1 = subValue; // Customer Reference 1
                            break;
                        case '03': 
                            result.Ref2 = subValue; // Customer Reference 2
                            break;
                        default:
                            console.warn(`Unknown subfield ID in Merchant Identifier: ${subId}`);
                            break;
                    }
                    subIndex += 4 + subLength;
                }
                break;
            }
            case '53':
                result.Currency = value;
                break;
            case '54':
                result.Amount = value;
                break;
            case '58':
                result.CountryCode = value;
                break;
            case '59':
                result.PayerName = value; // You may want to map Merchant Name here to PayerName
                break;
            case '62': {
                let subIndex = 0;
                while (subIndex < value.length) {
                    const subId = value.substring(subIndex, subIndex + 2);
                    const subLength = parseInt(value.substring(subIndex + 2, subIndex + 4), 10);
                    const subValue = value.substring(subIndex + 4, subIndex + 4 + subLength);

                    if (subId === '07') {
                        result.QRId = subValue; // QR ID
                    }
                    subIndex += 4 + subLength;
                }
                break;
            }
            case '63':
                result.CRC = value;
                break;
            default:
                console.warn(`Unknown field ID: ${id}`);
                break;
        }
        i += 4 + length;
    }

    // Patch form data with parsed result
    this.qrForm.patchValue(result);

    return result;
}

  onSubmit() {
    console.log('Form Data:', this.qrForm.value);
    this.creditNotiService.sendToAPI(this.qrForm.value).subscribe((res: any) => {

    });
  }
}
