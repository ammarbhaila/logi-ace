import Image from "next/image";
import Link from "next/link";

const rooms = [
  {
    title: (
      <>
        Conference <br /> rooms
      </>
    ),
    description:
      "Ensure everyone can be seen and heard clearly with solutions for traditional conference rooms feature a front-of-room camera, touch controller, and add-ons to extend meeting capture deeper in the room.",
    image: "/conference room.png",
    link: "#",
  },
  {
    title: (
      <>
        Huddle <br /> space
      </>
    ),
    description:
      "Easily deploy video meetings in smaller spaces for quick collaboration and ad-hoc meetings with solutions that are simple to set up and deploy at scale.",
    image: "/huddle space.png",
    link: "#",
  },
  {
    title: (
      <>
        Ideation <br /> space
      </>
    ),
    description:
      "Facilitate brainstorming and creative ideation across distributed teams with intuitive and interactive solutions built for open and dynamic spaces.",
    image: "/ideation space.png",
    link: "#",
  },
  {
    title: (
      <>
        Immersive <br /> video rooms
      </>
    ),
    description:
      "In rooms designed for video conferencing, furniture design and camera placement allow in-room participants to be better seen and captured.",
    image: "/immersive video.png",
    link: "#",
  },
];

export default function MeetingRooms() {
  return (
    <section className="bg-white py-12">
      <div className="max-w-[1200px] 2xl:max-w-[1358px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-center mb-10">
          <h2 className="text-[28px] md:text-[32px] font-bold text-gray-900 mb-4">
            Meeting Rooms
          </h2>
          <p className="text-gray-600 max-w-4xl mx-auto text-[15px] md:text-base leading-relaxed">
            Video-enable meeting rooms of every size from conference rooms to open spaces for seamless hybrid collaboration. Select the ideal room setup for your customer&apos;s POC kit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {rooms.map((room, index) => (
            <div
              key={index}
              className="relative overflow-hidden group h-[520px] flex flex-col justify-end text-center bg-[#262626]"
            >
              {/* Background Image Container */}
              <div className="absolute inset-0 z-0 flex flex-col items-center justify-start">
                <div className="relative w-full overflow-hidden">
                  <Image
                    src={room.image}
                    alt={room.title?.toString() || "Room"}
                    width={800}
                    height={600}
                    className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Dynamic Gradient perfectly attached to the bottom of the uncropped image */}
                  <div className="absolute bottom-0 left-0 w-full h-[150px] bg-gradient-to-t from-[#262626] via-[#262626]/80 to-transparent pointer-events-none"></div>
                </div>
                {/* Fill remaining space with solid background */}
                <div className="flex-1 w-full bg-[#262626]"></div>
              </div>

              {/* Content Container with fixed height to align all headings */}
              <div className="relative z-10 p-6 flex flex-col items-center h-[300px] w-full">
                <div className="mb-4">
                  <h3 className="text-[28px] font-bold text-white leading-[1.1]">
                    {room.title}
                  </h3>
                </div>
                <div className="flex-1 flex items-start justify-center w-full mb-6 px-1">
                  <p className="text-gray-200 text-[13px] leading-[1.6]">
                    {room.description}
                  </p>
                </div>
                <div className="mt-auto mb-4">
                  <Link
                    href={room.link}
                    className="bg-white text-gray-900 px-6 py-2 rounded-sm font-bold uppercase hover:bg-gray-100 transition-colors duration-300 text-[13px] tracking-wide inline-block"
                  >
                    EXPLORE
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
