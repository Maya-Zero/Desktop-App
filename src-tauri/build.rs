fn main() {
    tonic_build::configure()
        .build_server(false)
        .compile(
            &[
                "src/proto/mayachain/v1/x/mayachain/types/msg_deposit.proto",
                "src/proto/mayachain/v1/x/mayachain/types/msg_send.proto",
            ],
            &["src/proto"],
        )
        .unwrap();
    tauri_build::build()
}
