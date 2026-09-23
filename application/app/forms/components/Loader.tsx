import "./Loader.css";
import Image from "next/image";

const Loader = (props: { visible: boolean }) => {
  return (
    <>
      {props.visible && (
        <div className="loader">
          <div className="loader-bubble">
            <Image
              src="/lotus-loading.gif"
              alt="loading"
              width={96}
              height={67}
              unoptimized
              style={{
                height: "auto",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Loader;
