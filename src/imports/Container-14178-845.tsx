import imgImage2 from "figma:asset/6ff0647b1a98029f24cca1573c6d1a8781815f2e.png";
import imgImage3 from "figma:asset/5d0b0ca47a2fef3619dc885bf228bff9bc1ee031.png";
import imgImage4 from "figma:asset/824a5e162a44687f116e79bc89e9eaffc3000de0.png";

function Frame() {
  return (
    <div className="content-stretch flex items-center relative shrink-0">
      <p className="css-ew64yg font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#4f5e6d] text-[13px] tracking-[-0.1504px]">Manipulate my data</p>
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[#f9fafb] h-[160px] relative rounded-[8px] shrink-0 w-full" data-name="Button">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[14px] items-start pb-0 pt-[16px] px-[16px] relative size-full">
          <Frame />
          <div className="h-[110px] relative shrink-0 w-[235px]" data-name="image 2">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage2} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex items-center relative shrink-0">
      <p className="css-ew64yg font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#4f5e6d] text-[13px] tracking-[-0.1504px]">Help my to understand</p>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-[#f9fafb] h-[160px] relative rounded-[8px] shrink-0 w-full" data-name="Button">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[22px] items-start pb-0 pt-[16px] px-[16px] relative size-full">
          <Frame1 />
          <div className="absolute h-[118px] left-[16px] top-[39px] w-[174px]" data-name="image 3">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage3} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex items-center relative shrink-0">
      <p className="css-ew64yg font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#4f5e6d] text-[13px] tracking-[-0.1504px]">Auto configure my steps</p>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-[#f9fafb] h-[160px] relative rounded-[8px] shrink-0 w-full" data-name="Button">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[14px] items-start pb-0 pt-[16px] px-[16px] relative size-full">
          <Frame2 />
          <div className="h-[110px] relative shrink-0 w-[235px]" data-name="image 4">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage4} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Container() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] items-start relative size-full" data-name="Container">
      <Button />
      <Button1 />
      <Button2 />
    </div>
  );
}