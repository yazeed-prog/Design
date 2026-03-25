import svgPaths from "./svg-ydkwkviets";

function Text() {
  return (
    <div className="h-[20px] relative shrink-0 w-[6.453px]" data-name="Text">
      <p className="absolute css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-0 not-italic text-[#fb2c36] text-[14px] top-0 tracking-[-0.1504px]">*</p>
    </div>
  );
}

function Label() {
  return (
    <div className="content-stretch flex gap-[2px] items-center relative shrink-0" data-name="Label">
      <p className="css-ew64yg font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[20px] not-italic relative shrink-0 text-[#364153] text-[14px] tracking-[-0.1504px]">To</p>
      <Text />
    </div>
  );
}

function Frame() {
  return (
    <div className="relative self-stretch shrink-0 w-[12px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 57">
        <g id="Frame 12">
          <path d="M6 4L6 57" id="Line 1" stroke="var(--stroke-0, #D3DAE6)" strokeWidth="4" />
        </g>
      </svg>
    </div>
  );
}

function Icon() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_14195_1261)" id="Icon">
          <path d={svgPaths.p382c2800} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
        <defs>
          <clipPath id="clip0_14195_1261">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Text1() {
  return (
    <div className="bg-[#6a7282] relative rounded-[4px] shrink-0 size-[16px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon />
      </div>
    </div>
  );
}

function Text2() {
  return (
    <div className="h-[16px] relative shrink-0 w-[166.172px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid overflow-clip relative rounded-[inherit] size-full">
        <p className="absolute css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[16.5px] left-0 not-italic text-[#747c88] text-[14px] top-[0.5px]">Catch Webhook.user.name</p>
      </div>
    </div>
  );
}

function DataTag() {
  return (
    <div className="bg-white content-stretch flex gap-[4px] h-[22px] items-center px-[7px] py-px relative rounded-[4px] shrink-0" data-name="DataTag">
      <div aria-hidden="true" className="absolute border border-[#d1d5dc] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <Text1 />
      <Text2 />
    </div>
  );
}

function Frame3() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch">
      <div className="flex flex-row items-center size-full">
        <div className="content-center flex flex-wrap gap-[4px] items-center justify-between pb-[4px] pt-[10px] px-[10px] relative size-full">
          <p className="css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[16.5px] not-italic relative shrink-0 text-[#747c88] text-[14px]">{`Hi there, this is a message from `}</p>
          <DataTag />
        </div>
      </div>
    </div>
  );
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="Icon">
          <path d={svgPaths.p24827800} id="Vector" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p12ee6cc0} id="Vector_2" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="bg-white relative rounded-[4px] shrink-0 size-[24px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon1 />
      </div>
    </div>
  );
}

function Icon2() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="Icon">
          <path d={svgPaths.p3de7e600} id="Vector" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-white flex-[1_0_0] h-[24px] min-h-px min-w-px relative rounded-[4px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon2 />
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="content-stretch flex gap-[4px] h-[24px] items-start relative shrink-0 w-[52px]" data-name="Container">
      <Button />
      <Button1 />
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-end flex flex-wrap gap-[4px] items-end justify-end pb-[4px] pl-0 pr-[10px] pt-[10px] relative self-stretch shrink-0">
      <Container2 />
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex items-start relative shrink-0 w-full">
      <Frame />
      <Frame3 />
      <Frame4 />
    </div>
  );
}

function Container1() {
  return (
    <div className="bg-white content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-full" data-name="Container">
      <Frame1 />
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
      <Label />
      <Container1 />
    </div>
  );
}

function Text3() {
  return (
    <div className="h-[20px] relative shrink-0 w-[6.453px]" data-name="Text">
      <p className="absolute css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-0 not-italic text-[#fb2c36] text-[14px] top-0 tracking-[-0.1504px]">*</p>
    </div>
  );
}

function Label1() {
  return (
    <div className="content-stretch flex gap-[2px] items-center relative shrink-0" data-name="Label">
      <p className="css-ew64yg font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[20px] not-italic relative shrink-0 text-[#364153] text-[14px] tracking-[-0.1504px]">Subject</p>
      <Text3 />
    </div>
  );
}

function Frame7() {
  return (
    <div className="relative self-stretch shrink-0 w-[12px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 57">
        <g id="Frame 12">
          <path d="M6 4L6 57" id="Line 1" stroke="var(--stroke-0, #D3DAE6)" strokeWidth="4" />
        </g>
      </svg>
    </div>
  );
}

function Icon3() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_14195_1261)" id="Icon">
          <path d={svgPaths.p382c2800} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
        <defs>
          <clipPath id="clip0_14195_1261">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Text4() {
  return (
    <div className="bg-[#6a7282] relative rounded-[4px] shrink-0 size-[16px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon3 />
      </div>
    </div>
  );
}

function Text5() {
  return (
    <div className="h-[16px] relative shrink-0 w-[166.172px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid overflow-clip relative rounded-[inherit] size-full">
        <p className="absolute css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[16.5px] left-0 not-italic text-[#747c88] text-[14px] top-[0.5px]">Catch Webhook.user.name</p>
      </div>
    </div>
  );
}

function DataTag1() {
  return (
    <div className="bg-white content-stretch flex gap-[4px] h-[22px] items-center px-[7px] py-px relative rounded-[4px] shrink-0" data-name="DataTag">
      <div aria-hidden="true" className="absolute border border-[#d1d5dc] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <Text4 />
      <Text5 />
    </div>
  );
}

function Frame8() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch">
      <div className="flex flex-row items-center size-full">
        <div className="content-center flex flex-wrap gap-[4px] items-center justify-between pb-[4px] pt-[10px] px-[10px] relative size-full">
          <p className="css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[16.5px] not-italic relative shrink-0 text-[#747c88] text-[14px]">{`Hi there, this is a message from `}</p>
          <DataTag1 />
        </div>
      </div>
    </div>
  );
}

function Icon4() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="Icon">
          <path d={svgPaths.p24827800} id="Vector" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p12ee6cc0} id="Vector_2" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-white relative rounded-[4px] shrink-0 size-[24px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon4 />
      </div>
    </div>
  );
}

function Icon5() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="Icon">
          <path d={svgPaths.p3de7e600} id="Vector" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Button3() {
  return (
    <div className="bg-white flex-[1_0_0] h-[24px] min-h-px min-w-px relative rounded-[4px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon5 />
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex gap-[4px] h-[24px] items-start relative shrink-0 w-[52px]" data-name="Container">
      <Button2 />
      <Button3 />
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-end flex flex-wrap gap-[4px] items-end justify-end pb-[4px] pl-0 pr-[10px] pt-[10px] relative self-stretch shrink-0">
      <Container4 />
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex items-start relative shrink-0 w-full">
      <Frame7 />
      <Frame8 />
      <Frame9 />
    </div>
  );
}

function Container3() {
  return (
    <div className="bg-white content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-full" data-name="Container">
      <Frame6 />
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
      <Label1 />
      <Container3 />
    </div>
  );
}

function Text6() {
  return (
    <div className="h-[20px] relative shrink-0 w-[6.453px]" data-name="Text">
      <p className="absolute css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-0 not-italic text-[#fb2c36] text-[14px] top-0 tracking-[-0.1504px]">*</p>
    </div>
  );
}

function Label2() {
  return (
    <div className="content-stretch flex gap-[2px] items-center relative shrink-0" data-name="Label">
      <p className="css-ew64yg font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[20px] not-italic relative shrink-0 text-[#364153] text-[14px] tracking-[-0.1504px]">Message Body</p>
      <Text6 />
    </div>
  );
}

function Frame12() {
  return (
    <div className="relative self-stretch shrink-0 w-[12px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 57">
        <g id="Frame 12">
          <path d="M6 4L6 57" id="Line 1" stroke="var(--stroke-0, #D3DAE6)" strokeWidth="4" />
        </g>
      </svg>
    </div>
  );
}

function Icon6() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_14195_1261)" id="Icon">
          <path d={svgPaths.p382c2800} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
        <defs>
          <clipPath id="clip0_14195_1261">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Text7() {
  return (
    <div className="bg-[#6a7282] relative rounded-[4px] shrink-0 size-[16px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon6 />
      </div>
    </div>
  );
}

function Text8() {
  return (
    <div className="h-[16px] relative shrink-0 w-[166.172px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid overflow-clip relative rounded-[inherit] size-full">
        <p className="absolute css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[16.5px] left-0 not-italic text-[#747c88] text-[14px] top-[0.5px]">Catch Webhook.user.name</p>
      </div>
    </div>
  );
}

function DataTag2() {
  return (
    <div className="bg-white content-stretch flex gap-[4px] h-[22px] items-center px-[7px] py-px relative rounded-[4px] shrink-0" data-name="DataTag">
      <div aria-hidden="true" className="absolute border border-[#d1d5dc] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <Text7 />
      <Text8 />
    </div>
  );
}

function Frame13() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch">
      <div className="flex flex-row items-center size-full">
        <div className="content-center flex flex-wrap gap-[4px] items-center justify-between pb-[4px] pt-[10px] px-[10px] relative size-full">
          <p className="css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[16.5px] not-italic relative shrink-0 text-[#747c88] text-[14px]">{`Hi there, this is a message from `}</p>
          <DataTag2 />
        </div>
      </div>
    </div>
  );
}

function Icon7() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="Icon">
          <path d={svgPaths.p24827800} id="Vector" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p12ee6cc0} id="Vector_2" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Button4() {
  return (
    <div className="bg-white relative rounded-[4px] shrink-0 size-[24px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon7 />
      </div>
    </div>
  );
}

function Icon8() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="Icon">
          <path d={svgPaths.p3de7e600} id="Vector" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Button5() {
  return (
    <div className="bg-white flex-[1_0_0] h-[24px] min-h-px min-w-px relative rounded-[4px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon8 />
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="content-stretch flex gap-[4px] h-[24px] items-start relative shrink-0 w-[52px]" data-name="Container">
      <Button4 />
      <Button5 />
    </div>
  );
}

function Frame14() {
  return (
    <div className="content-end flex flex-wrap gap-[4px] items-end justify-end pb-[4px] pl-0 pr-[10px] pt-[10px] relative self-stretch shrink-0">
      <Container6 />
    </div>
  );
}

function Frame11() {
  return (
    <div className="content-stretch flex items-start relative shrink-0 w-full">
      <Frame12 />
      <Frame13 />
      <Frame14 />
    </div>
  );
}

function Container5() {
  return (
    <div className="bg-white content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-full" data-name="Container">
      <Frame11 />
    </div>
  );
}

function Frame10() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
      <Label2 />
      <Container5 />
    </div>
  );
}

function Text9() {
  return (
    <div className="h-[20px] relative shrink-0 w-[6.453px]" data-name="Text">
      <p className="absolute css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-0 not-italic text-[#fb2c36] text-[14px] top-0 tracking-[-0.1504px]">*</p>
    </div>
  );
}

function Label3() {
  return (
    <div className="content-stretch flex gap-[2px] items-center relative shrink-0" data-name="Label">
      <p className="css-ew64yg font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[20px] not-italic relative shrink-0 text-[#364153] text-[14px] tracking-[-0.1504px]">Action</p>
      <Text9 />
    </div>
  );
}

function Frame17() {
  return (
    <div className="relative self-stretch shrink-0 w-[12px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 38">
        <g id="Frame 12">
          <path d="M6 4L6 38" id="Line 1" stroke="var(--stroke-0, #D3DAE6)" strokeWidth="4" />
        </g>
      </svg>
    </div>
  );
}

function Frame18() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch">
      <div className="flex flex-row items-center size-full">
        <div className="content-center flex flex-wrap gap-[4px] items-center justify-between pb-[4px] pt-[10px] px-[10px] relative size-full">
          <p className="css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[16.5px] not-italic relative shrink-0 text-[#747c88] text-[14px]">Send email</p>
        </div>
      </div>
    </div>
  );
}

function Icon9() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="Icon">
          <path d={svgPaths.p24827800} id="Vector" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p12ee6cc0} id="Vector_2" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Button6() {
  return (
    <div className="bg-white relative rounded-[4px] shrink-0 size-[24px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon9 />
      </div>
    </div>
  );
}

function Icon10() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="Icon">
          <path d={svgPaths.p3de7e600} id="Vector" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Button7() {
  return (
    <div className="bg-white flex-[1_0_0] h-[24px] min-h-px min-w-px relative rounded-[4px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon10 />
      </div>
    </div>
  );
}

function Container8() {
  return (
    <div className="content-stretch flex gap-[4px] h-[24px] items-start relative shrink-0 w-[52px]" data-name="Container">
      <Button6 />
      <Button7 />
    </div>
  );
}

function Frame19() {
  return (
    <div className="content-end flex flex-wrap gap-[4px] items-end justify-end pb-[4px] pl-0 pr-[10px] pt-[10px] relative self-stretch shrink-0">
      <Container8 />
    </div>
  );
}

function Frame16() {
  return (
    <div className="content-stretch flex items-start relative shrink-0 w-full">
      <Frame17 />
      <Frame18 />
      <Frame19 />
    </div>
  );
}

function Container7() {
  return (
    <div className="bg-white content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-full" data-name="Container">
      <Frame16 />
    </div>
  );
}

function Frame15() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
      <Label3 />
      <Container7 />
    </div>
  );
}

export default function Container() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[16px] items-start relative rounded-[10px] size-full" data-name="Container">
      <Frame2 />
      <Frame5 />
      <Frame10 />
      <Frame15 />
    </div>
  );
}