import svgPaths from "./svg-czveekzxb0";

function TextArea() {
  return (
    <div className="h-[42px] relative shrink-0 w-full" data-name="Text Area">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-start pb-[4px] pt-[10px] px-[12px] relative size-full">
          <p className="css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[14px] text-[rgba(10,10,10,0.5)] tracking-[-0.1504px]">Write your message...</p>
        </div>
      </div>
    </div>
  );
}

function Icon() {
  return (
    <div className="absolute left-[4px] size-[16px] top-[4px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p9145900} id="Vector" stroke="var(--stroke-0, #6A7282)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p2daff3c0} id="Vector_2" stroke="var(--stroke-0, #6A7282)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M8 14.6667V8" id="Vector_3" stroke="var(--stroke-0, #6A7282)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="relative rounded-[4px] shrink-0 size-[24px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Icon />
      </div>
    </div>
  );
}

function Icon1() {
  return (
    <div className="absolute left-[4px] size-[16px] top-[4px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_14150_63)" id="Icon">
          <path d={svgPaths.p3adb3b00} id="Vector" stroke="var(--stroke-0, #6A7282)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p266af080} id="Vector_2" stroke="var(--stroke-0, #6A7282)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
        <defs>
          <clipPath id="clip0_14150_63">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button1() {
  return (
    <div className="flex-[1_0_0] h-[24px] min-h-px min-w-px relative rounded-[4px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Icon1 />
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="h-[26px] relative shrink-0 w-[52px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[4px] items-center relative size-full">
        <Button />
        <Button1 />
      </div>
    </div>
  );
}

function Icon2() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
        <g id="Icon">
          <path d="M2.5 6L6 2.5L9.5 6" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 9.5V2.5" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-[#6e40e2] opacity-50 relative rounded-[16777200px] shrink-0 size-[28px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon2 />
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="h-[36px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[8px] py-0 relative size-full">
          <Container2 />
          <Button2 />
        </div>
      </div>
    </div>
  );
}

export default function Container() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[6px] items-start p-px relative rounded-[10px] size-full" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#faadff] border-solid inset-0 pointer-events-none rounded-[10px] shadow-[0px_4px_0px_0px_#f7e2ff]" />
      <TextArea />
      <Container1 />
    </div>
  );
}