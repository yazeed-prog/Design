import imgImage2 from "figma:asset/6ff0647b1a98029f24cca1573c6d1a8781815f2e.png";
import imgImage3 from "figma:asset/5d0b0ca47a2fef3619dc885bf228bff9bc1ee031.png";
import imgImage4 from "figma:asset/824a5e162a44687f116e79bc89e9eaffc3000de0.png";

interface QuickStartActionsProps {
  onActionClick: (text: string) => void;
  isVisible: boolean;
}

export function QuickStartActions({ onActionClick, isVisible }: QuickStartActionsProps) {
  if (!isVisible) return null;

  const buttons = [
    {
      title: 'Manipulate my data',
      prompt: 'Help me process and transform the data to the required format',
      delay: '0ms',
      image: imgImage2,
      imageClass: 'h-[110px] relative shrink-0 w-[235px]',
      imagePosition: 'relative'
    },
    {
      title: 'Help me to understand',
      prompt: 'Explain the available data and how I can use it',
      delay: '100ms',
      image: imgImage3,
      imageClass: 'absolute h-[118px] left-[16px] top-[39px] w-[174px]',
      imagePosition: 'absolute',
      gap: 'gap-[22px]'
    },
    {
      title: 'Auto configure my steps',
      prompt: 'Automatically configure all fields using the available data',
      delay: '200ms',
      image: imgImage4,
      imageClass: 'h-[110px] relative shrink-0 w-[235px]',
      imagePosition: 'relative'
    }
  ];

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="content-stretch flex flex-col gap-[10px] items-start relative w-full mt-2">
        {buttons.map((button, index) => (
          <button
            key={index}
            onClick={() => onActionClick(button.prompt)}
            className="bg-[#f9fafb] h-[160px] relative rounded-[8px] shrink-0 w-full hover:bg-gray-100 transition-colors animate-slideUp opacity-0 cursor-pointer"
            style={{
              animationDelay: button.delay,
              animationFillMode: 'forwards'
            }}
            data-name="Button"
          >
            <div className="overflow-clip rounded-[inherit] size-full">
              <div className={`content-stretch flex flex-col ${button.gap || 'gap-[14px]'} items-start pb-0 pt-[16px] px-[16px] relative size-full`}>
                {/* Title */}
                <div className="content-stretch flex items-center relative shrink-0">
                  <p className="css-ew64yg font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#4f5e6d] text-[13px] tracking-[-0.1504px]">
                    {button.title}
                  </p>
                </div>
                
                {/* Image */}
                <div className={button.imageClass}>
                  <img 
                    alt="" 
                    className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" 
                    src={button.image} 
                  />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}