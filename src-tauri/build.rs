fn main() {
    tonic_build::configure()
        .build_server(false)
        .compile(
            &[
                "src/proto/mayachain/v1/x/mayachain/types/msg_deposit.proto",
                "src/proto/mayachain/v1/x/mayachain/types/msg_send.proto",
                "src/proto/cosmos/base/v1beta1/coin.proto",
                "src/proto/gogoproto/gogo.proto",
                "src/proto/cosmos_proto/cosmos.proto",
                "src/proto/amino/amino.proto",
                "src/proto/mayachain/v1/common/common.proto",
            ],
            &["src/proto"],
        )
        .unwrap();
    tauri_build::build()
}
