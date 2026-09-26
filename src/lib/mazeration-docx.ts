import { Document, Packer, PageOrientation } from 'docx';
import { saveAs } from 'file-saver';
import type { MazerationFormData } from '@/schemas/mazerationSchema';
import type { useCalculatedFormValues } from '@/hooks/use-calculated-form-values';

const convertMillimetersToTwip = (mm: number): number => {
    return Math.round(mm * (1440 / 25.4));
};

export function generateDocx(
  data: MazerationFormData | null,
  calculatedValues: ReturnType<typeof useCalculatedFormValues>["calculatedValues"],
  isEmptyForm: boolean = false
) {
  const docInstance = new Document({
    sections: [{
        properties: {
            page: {
                size: {
                    width: convertMillimetersToTwip(isEmptyForm ? 210 : 297),
                    height: convertMillimetersToTwip(isEmptyForm ? 297 : 210),
                    orientation: isEmptyForm ? PageOrientation.PORTRAIT : PageOrientation.LANDSCAPE,
                },
                margin: {
                    top: convertMillimetersToTwip(15),
                    right: convertMillimetersToTwip(15),
                    bottom: convertMillimetersToTwip(15),
                    left: convertMillimetersToTwip(15),
                },
            },
             column: isEmptyForm ? {
                count: 2,
                space: convertMillimetersToTwip(10),
            } : undefined,
        },
        children: [],
    }],
});

const fileName = isEmptyForm ? 'leeres_mazerations-protokoll.docx' : `mazerations-protokoll_${data!.batchNumber}_${data!.macerationName.replace(/\s+/g, '_')}.docx`;

  Packer.toBlob(docInstance).then(blob => {
    saveAs(blob, fileName);
  });
}
