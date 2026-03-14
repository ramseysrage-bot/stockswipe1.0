export default function CardStamps({ bullOpacity, bearOpacity }) {
  return (
    <>
      <div className="card-stamp stamp-save" style={{ opacity: bullOpacity }}>BULL</div>
      <div className="card-stamp stamp-pass" style={{ opacity: bearOpacity }}>BEAR</div>
    </>
  )
}
