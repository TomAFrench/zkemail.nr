import fs from "fs";
import path from "path";
import { ZKEmailProver } from "../src/prover";
import { generateEmailVerifierInputs } from "../src/index";
import { makeEmailAddressCharTable } from "../src/utils";
// import circuit1024 from "../../examples/verify_email_1024_bit_dkim/target/verify_email_1024_bit_dkim.json";
import circuit2048 from "../../examples/verify_email_2048_bit_dkim/target/verify_email_2048_bit_dkim.json";
import circuitPartialHash from "../../examples/partial_hash/target/partial_hash.json";
import circuitEmailMask from "../../examples/email_mask/target/email_mask.json";
import circuitExtractAddresses from "../../examples/extract_addresses/target/extract_addresses.json";

const emails = {
  small: fs.readFileSync(path.join(__dirname, "./test-data/email-good.eml")),
  large: fs.readFileSync(
    path.join(__dirname, "./test-data/email-good-large.eml")
  ),
};

// default header/ body lengths to use for input gen
const inputParams = {
  maxHeadersLength: 512,
  maxBodyLength: 1024,
};

describe("ZKEmail.nr Circuit Unit Tests", () => {
  // todo: get a github email from a throwaway account to verify
  // let prover1024: ZKEmailProver;
  const selectorText = "All nodes in the Bitcoin network can consult it";
  let prover2048: ZKEmailProver;
  let proverPartialHash: ZKEmailProver;
  let proverMasked: ZKEmailProver;
  let proverExtractAddresses: ZKEmailProver;

  beforeAll(() => {
    //@ts-ignore
    // prover1024 = new ZKEmailProver(circuit1024, "all");
    //@ts-ignore
    prover2048 = new ZKEmailProver(circuit2048, "all");
    //@ts-ignore
    proverPartialHash = new ZKEmailProver(circuitPartialHash, "all");
    //@ts-ignore
    proverMasked = new ZKEmailProver(circuitEmailMask, "all");
    //@ts-ignore
    proverExtractAddresses = new ZKEmailProver(circuitExtractAddresses, "all");
  });

  afterAll(async () => {
    // await prover1024.destroy();
    await prover2048.destroy();
    await proverPartialHash.destroy();
    await proverMasked.destroy();
    await proverExtractAddresses.destroy();
  });

  describe("Successful Cases", () => {
    // it("Char table: ", async () => {
    //     console.log(makeEmailAddressCharTable());
    // })
    xit("2048-bit DKIM", async () => {
      const inputs = await generateEmailVerifierInputs(
        emails.small,
        inputParams
      );
      await prover2048.simulateWitness(inputs);
    });
    xit("Partial Hash", async () => {
      const inputs = await generateEmailVerifierInputs(emails.large, {
        shaPrecomputeSelector: selectorText,
        maxHeadersLength: 512,
        maxBodyLength: 192,
      });
      await proverPartialHash.simulateWitness(inputs);
    });
    xit("Masked Header/ Body", async () => {
      // make masks
      const headerMask = Array.from(
        { length: inputParams.maxHeadersLength },
        () => Math.floor(Math.random() * 2)
      );
      const bodyMask = Array.from({ length: inputParams.maxBodyLength }, () =>
        Math.floor(Math.random() * 2)
      );
      const inputs = await generateEmailVerifierInputs(emails.small, {
        headerMask,
        bodyMask,
        ...inputParams,
      });
      // simulate witness
      const result = await proverMasked.simulateWitness(inputs);
      // compute mask locally
      const expectedMaskedHeader = inputs.header.storage.map((byte, i) =>
        headerMask[i] === 1 ? parseInt(byte) : 0
      );
      const expectedMaskedBody = inputs.body!.storage.map((byte, i) =>
        bodyMask[i] === 1 ? parseInt(byte) : 0
      );
      // compare results
      const acutalMaskedHeader = result.returnValue[1].map((byte) =>
        parseInt(byte, 16)
      );
      const acutalMaskedBody = result.returnValue[2].map((byte) =>
        parseInt(byte, 16)
      );
      expect(expectedMaskedHeader).toEqual(acutalMaskedHeader);
      expect(expectedMaskedBody).toEqual(acutalMaskedBody);
    });
    it("Extract Sender/ Recipient", async () => {
        const inputs = await generateEmailVerifierInputs(emails.small, {
            extractFrom: true,
            extractTo: true,
            ...inputParams,
        });
        console.log()
        // simulate witness
        // const result = await proverExtractAddresses.simulateWitness(inputs);
        // console.log("result: ", result.returnValue);
        // // parse expected addresses
        // const header = Buffer.from(inputs.header.storage.map((byte) => parseInt(byte))).toString();
        // const fromAddressStart = parseInt(inputs.from_adddres_sequence!.index);
        // const fromAddressEnd = fromAddressStart + parseInt(inputs.from_adddres_sequence!.length);
        // const from = header.slice(fromAddressStart, fromAddressEnd);
        // const toAddressStart = parseInt(inputs.to_address_sequence!.index);
        // const toAddressEnd = toAddressStart + parseInt(inputs.to_address_sequence!.length);
        // const to = header.slice(toAddressStart, toAddressEnd);

    });
  });
});
