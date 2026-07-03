type Props = {
    src: string
}

const Preview = ({src} : Props) => {
    return (
        <iframe
            title={"preview"}
            id={"preview"}
            src={`${src}/render`}
        ></iframe>
    )
}

export default Preview